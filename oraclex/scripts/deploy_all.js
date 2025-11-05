import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

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
  const abi = j.abi;
  const bytecode = j.bytecode?.object || j.bytecode; // HH vs Foundry
  return { abi, bytecode };
}

async function main() {
  const { RPC_URL, PRIVATE_KEY, DEMO_WALLET } = process.env;
  if (!RPC_URL || !PRIVATE_KEY) throw new Error('RPC_URL and PRIVATE_KEY required');
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Deployer:', await wallet.getAddress());

  const deploy = async (name, args = []) => {
    const { abi, bytecode } = loadArtifact(name);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(...args);
    console.log(`Deploying ${name}... tx=${contract.deploymentTransaction().hash}`);
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(`${name} at`, addr);
    return new ethers.Contract(addr, abi, wallet);
  };

  const usdc = await deploy('MockUSDC');
  const adapter = await deploy('OracleXOracleAdapter', [ethers.ZeroAddress]);
  const verifier = await deploy('OracleXVerifier');
  const factory = await deploy('OracleXMarketFactory', [await usdc.getAddress(), await adapter.getAddress(), await verifier.getAddress()]);
  const setTx = await adapter.setFactory(await factory.getAddress());
  await setTx.wait();
  console.log('Adapter wired to factory');

  const mockChainlink = await deploy('MockChainlinkOracle', [await adapter.getAddress()]);

  const demo = DEMO_WALLET || (await wallet.getAddress());
  const mintTx = await usdc.mint(demo, 1_000_000n * 10n ** 6n);
  await mintTx.wait();
  console.log('Minted 1,000,000 mUSDC to', demo);

  const deployed = {
    network: await provider.getNetwork().then(n => Number(n.chainId)),
    deployer: await wallet.getAddress(),
    MockUSDC: await usdc.getAddress(),
    OracleXOracleAdapter: await adapter.getAddress(),
    OracleXVerifier: await verifier.getAddress(),
    OracleXMarketFactory: await factory.getAddress(),
    MockChainlinkOracle: await mockChainlink.getAddress()
  };
  fs.writeFileSync(path.join(root, 'deployed.json'), JSON.stringify(deployed, null, 2));
  console.log('Wrote deployed.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
