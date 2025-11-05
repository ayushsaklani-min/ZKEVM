import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*'}));

const PORT = process.env.BACKEND_PORT || 4000;
const WSP = process.env.WS_PORT || 4001;
const root = process.cwd();

const deployedPath = path.join(root, 'deployed.json');
let deployed = fs.existsSync(deployedPath) ? JSON.parse(fs.readFileSync(deployedPath, 'utf8')) : null;

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : null;

function findArtifactPath(name) {
  const hhRoot = path.join(root, 'artifacts', 'contracts');
  const fdy = path.join(root, 'out', `${name}.sol`, `${name}.json`);
  if (fs.existsSync(fdy)) return fdy;
  if (!fs.existsSync(hhRoot)) return null;
  const stack = [hhRoot];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name === `${name}.json`) return p;
    }
  }
  return null;
}

function loadArtifact(name) {
  const p = findArtifactPath(name);
  if (!p) throw new Error(`Artifact for ${name} not found. Run: npx hardhat compile`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return j;
}

const artifacts = {};
['OracleXMarketFactory', 'OracleXVerifier', 'MockUSDC', 'OracleXVault', 'MockChainlinkOracle'].forEach(n => {
  try { artifacts[n] = loadArtifact(n); } catch (e) { /* ignore until built */ }
});

function getContract(name, address) {
  const a = artifacts[name] || loadArtifact(name);
  return new ethers.Contract(address, a.abi, wallet);
}

const markets = new Map(); // marketId => { eventId, description, closeTimestamp, vault, probability }

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { try { c.send(data); } catch (e) {} });
}

app.get('/addresses', (req, res) => {
  try {
    if (!deployed && fs.existsSync(deployedPath)) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    res.json(deployed || {});
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/abi/:name', (req, res) => {
  try {
    const name = req.params.name;
    const art = loadArtifact(name);
    res.json({ abi: art.abi });
  } catch (e) {
    res.status(404).json({ error: 'ABI not found' });
  }
});

app.get('/markets', (req, res) => {
  const all = Array.from(markets.entries()).map(([marketId, m]) => ({ marketId, ...m }));
  res.json(all);
});

app.post('/create-market', async (req, res) => {
  const { eventId, description, closeTimestamp } = req.body;
  const network = await provider.getNetwork();
  const account = wallet ? await wallet.getAddress() : ethers.ZeroAddress;
  const marketId = ethers.solidityPackedKeccak256(
    ['string','string','uint256','address','uint256'],
    [eventId, description, BigInt(closeTimestamp), account, BigInt(network.chainId)]
  );
  markets.set(marketId, { eventId, description, closeTimestamp, vault: null, probability: null });
  broadcast({ type: 'market_created', marketId, eventId, description, closeTimestamp });
  res.json({ marketId });
});

app.post('/deploy-market', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { marketId, eventId, description, closeTimestamp } = req.body;
    const factory = getContract('OracleXMarketFactory', deployed.OracleXMarketFactory);
    const tx = await factory.createMarket(eventId, description, closeTimestamp);
    const rc = await tx.wait();
    let vaultAddr = null;
    let onChainId = null;
    for (const l of rc.logs) {
      try {
        const i = new ethers.Interface(loadArtifact('OracleXMarketFactory').abi);
        const parsed = i.parseLog(l);
        if (parsed && parsed.name === 'MarketCreated') {
          onChainId = parsed.args[0];
          vaultAddr = parsed.args[1];
          break;
        }
      } catch (_) {}
    }
    if (!vaultAddr || !onChainId) throw new Error('Vault/Id not found in logs');
    const m = markets.get(marketId) || { eventId, description, closeTimestamp };
    m.vault = vaultAddr;
    markets.delete(marketId);
    markets.set(onChainId, m);
    broadcast({ type: 'market_deployed', marketId: onChainId, vault: vaultAddr });
    res.json({ marketId: onChainId, vault: vaultAddr });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/ai-run', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { marketId, eventId, description, closeTimestamp } = req.body;
    const ts = Math.floor(Date.now() / 1000);
    const py = spawn('python', [path.join(root, 'backend', 'ai_proxy.py')]);
    const input = { eventId, description, timestamp: ts, chainId: await provider.getNetwork().then(n => Number(n.chainId)) };
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
    let out = '';
    py.stdout.on('data', (d) => out += d.toString());
    py.stderr.on('data', (d) => console.error(d.toString()));
    py.on('close', async () => {
      const { probability, explanation, aiHash } = JSON.parse(out);
      const verifier = getContract('OracleXVerifier', deployed.OracleXVerifier);
      const tx = await verifier.commitAI(marketId, aiHash, '');
      await tx.wait();
      const m = markets.get(marketId) || { eventId, description, closeTimestamp };
      m.probability = probability;
      markets.set(marketId, m);
      broadcast({ type: 'ai_committed', marketId, probability, explanation, aiHash });
      res.json({ probability, explanation, aiHash });
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/allocate', async (req, res) => {
  try {
    const { marketId } = req.body;
    const m = markets.get(marketId);
    if (!m || !m.vault) throw new Error('Market not deployed');
    const contract = getContract('OracleXVault', m.vault);
    const bal = await getContract('MockUSDC', deployed.MockUSDC).balanceOf(m.vault);
    const prob = (m && m.probability != null) ? m.probability : 50;
    const yesAmt = (bal * BigInt(prob)) / 100n;
    const noAmt = bal - yesAmt;
    const tx = await contract.allocateLiquidity(yesAmt, noAmt);
    await tx.wait();
    broadcast({ type: 'allocated', marketId, yesAmt: yesAmt.toString(), noAmt: noAmt.toString() });
    res.json({ yesAmt: yesAmt.toString(), noAmt: noAmt.toString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/simulate-outcome', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { marketId, winningSide } = req.body;
    const oracle = getContract('MockChainlinkOracle', deployed.MockChainlinkOracle);
    const tx = await oracle.postOutcome(marketId, winningSide);
    await tx.wait();
    broadcast({ type: 'settled', marketId, winningSide });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/faucet', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const to = req.body.to;
    const amount = req.body.amount ? BigInt(req.body.amount) : 1000n * 10n ** 6n; // default 1000 mUSDC
    const usdc = getContract('MockUSDC', deployed.MockUSDC);
    const tx = await usdc.mint(to, amount);
    await tx.wait();
    res.json({ ok: true, to, amount: amount.toString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/deposit', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { marketId, vault, side, amount } = req.body;
    const m = markets.get(marketId);
    const v = vault || (m && m.vault);
    if (!v) throw new Error('Vault not found');
    const usdc = getContract('MockUSDC', deployed.MockUSDC);
    const vaultC = getContract('OracleXVault', v);
    const amt = BigInt(amount);
    const t1 = await usdc.approve(v, amt);
    await t1.wait();
    const t2 = await vaultC.deposit(Number(side), amt);
    await t2.wait();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/get-commitment/:marketId', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const marketId = req.params.marketId;
    const verifier = getContract('OracleXVerifier', deployed.OracleXVerifier);
    const aiHash = await verifier.getCommitment(marketId);
    res.json({ marketId, aiHash });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const server = app.listen(PORT, () => console.log(`Backend on :${PORT}`));

const wss = new WebSocketServer({ port: WSP });
wss.on('listening', () => console.log(`WS on :${WSP}`));
