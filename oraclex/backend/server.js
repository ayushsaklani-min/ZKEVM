import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { ethers } from 'ethers';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Filter from 'bad-words';

// Load environment variables BEFORE importing supabase
dotenv.config();
import * as supabaseDb from './supabase.js';

const app = express();
app.use(express.json({ limit: '100kb' })); // Limit request size
app.use(cors({ origin: '*' }));

// Rate limiting for market creation (5 requests per 15 minutes per IP)
const createMarketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many market creation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Render sets PORT automatically, fallback to BACKEND_PORT or 4000
const PORT = process.env.PORT || process.env.BACKEND_PORT || 4000;
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
['OracleXMarketFactory', 'OracleXVerifier', 'OracleXVault'].forEach(n => {
  try { artifacts[n] = loadArtifact(n); } catch (e) { /* ignore until built */ }
});

// Standard ERC20 ABI for USDC
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

function getContract(name, address) {
  const a = artifacts[name] || loadArtifact(name);
  return new ethers.Contract(address, a.abi, wallet);
}

function getUSDCContract(address) {
  return new ethers.Contract(address, ERC20_ABI, wallet || provider);
}

// Content moderation filter
const profanityFilter = new Filter();
profanityFilter.addWords('spam', 'scam'); // Add custom words if needed

// Legacy in-memory fallback (only used if Supabase not configured)
const markets = new Map(); // marketId => { eventId, description, closeTimestamp, vault, probability }

function broadcast(msg) {
  const data = JSON.stringify(msg);
  if (wss) {
    wss.clients.forEach(c => { 
      try { 
        if (c.readyState === 1) { // WebSocket.OPEN
          c.send(data); 
        }
      } catch (e) {
        // Silently handle closed connections
      }
    });
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    if (name === 'USDC') {
      // Return standard ERC20 ABI for USDC
      res.json({ abi: ERC20_ABI });
    } else {
      const art = loadArtifact(name);
      res.json({ abi: art.abi });
    }
  } catch (e) {
    res.status(404).json({ error: 'ABI not found' });
  }
});

app.get('/markets', async (req, res) => {
  try {
    if (supabaseDb.supabase) {
      // Use Supabase
      const dbMarkets = await supabaseDb.getAllMarkets();
      const formatted = dbMarkets.map(m => ({
        marketId: m.market_id,
        eventId: m.event_id,
        description: m.description,
        closeTimestamp: m.close_timestamp,
        vault: m.vault_address,
        probability: m.probability,
        creatorAddress: m.creator_address,
        createdAt: m.created_at,
        deployedAt: m.deployed_at,
      }));
      return res.json(formatted);
    } else {
      // Fallback to in-memory
      const all = Array.from(markets.entries()).map(([marketId, m]) => ({ marketId, ...m }));
      res.json(all);
    }
  } catch (error) {
    console.error('Error fetching markets:', error);
    // Fallback to in-memory on error
    const all = Array.from(markets.entries()).map(([marketId, m]) => ({ marketId, ...m }));
    res.json(all);
  }
});

// Input validation helper
function validateMarketInput(eventId, description, closeTimestamp) {
  const errors = [];
  
  // Event ID validation
  if (!eventId || typeof eventId !== 'string') {
    errors.push('Event ID is required and must be a string');
  } else {
    const trimmed = eventId.trim();
    if (trimmed.length === 0) {
      errors.push('Event ID cannot be empty');
    } else if (trimmed.length > 100) {
      errors.push('Event ID must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9\-_ ]+$/.test(trimmed)) {
      errors.push('Event ID can only contain letters, numbers, spaces, hyphens, and underscores');
    }
  }
  
  // Description validation
  if (!description || typeof description !== 'string') {
    errors.push('Description is required and must be a string');
  } else {
    const trimmed = description.trim();
    if (trimmed.length === 0) {
      errors.push('Description cannot be empty');
    } else if (trimmed.length > 500) {
      errors.push('Description must be 500 characters or less');
    }
  }
  
  // Close timestamp validation
  if (!closeTimestamp || typeof closeTimestamp !== 'number') {
    errors.push('Close timestamp is required and must be a number');
  } else {
    const now = Math.floor(Date.now() / 1000);
    const maxFuture = now + (365 * 24 * 60 * 60); // 1 year from now
    
    if (closeTimestamp < now) {
      errors.push('Close timestamp cannot be in the past');
    } else if (closeTimestamp > maxFuture) {
      errors.push('Close timestamp cannot be more than 1 year in the future');
    }
  }
  
  return errors;
}

// Sanitize string inputs (remove potential XSS)
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 500); // Enforce max length
}

// Content moderation check
function checkContentModeration(text) {
  if (!text || typeof text !== 'string') return { allowed: true };
  
  const isProfane = profanityFilter.isProfane(text);
  if (isProfane) {
    return { 
      allowed: false, 
      reason: 'Content contains inappropriate language. Please use professional language.' 
    };
  }
  
  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters (e.g., "aaaaaaaaaaa")
    /(.){1,3}\s*(.){1,3}\s*(.){1,3}\s*(.){1,3}\s*(.){1,3}/, // Random character spam
  ];
  
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return { 
        allowed: false, 
        reason: 'Content appears to be spam. Please provide a meaningful description.' 
      };
    }
  }
  
  return { allowed: true };
}

// Verify wallet signature
async function verifyWalletSignature(address, message, signature) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

app.post('/create-market', createMarketLimiter, async (req, res) => {
  try {
    let { eventId, description, closeTimestamp, creatorAddress, signature, message } = req.body;
    
    // Verify wallet signature if provided
    if (creatorAddress && signature && message) {
      const isValid = await verifyWalletSignature(creatorAddress, message, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid wallet signature' });
      }
    } else {
      // Fallback: use deployer wallet address if no signature provided
      creatorAddress = wallet ? await wallet.getAddress() : ethers.ZeroAddress;
    }
    
    // Sanitize inputs
    eventId = sanitizeString(eventId);
    description = sanitizeString(description);
    
    // Content moderation
    const eventIdCheck = checkContentModeration(eventId);
    if (!eventIdCheck.allowed) {
      return res.status(400).json({ error: eventIdCheck.reason });
    }
    
    const descriptionCheck = checkContentModeration(description);
    if (!descriptionCheck.allowed) {
      return res.status(400).json({ error: descriptionCheck.reason });
    }
    
    // Validate inputs
    const validationErrors = validateMarketInput(eventId, description, closeTimestamp);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }
    
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Generate market ID
    const marketId = ethers.solidityPackedKeccak256(
      ['string','string','uint256','address','uint256'],
      [eventId, description, BigInt(closeTimestamp), creatorAddress, BigInt(chainId)]
    );
    
    // Check for duplicate market
    if (supabaseDb.supabase) {
      const exists = await supabaseDb.checkMarketExists(marketId);
      if (exists) {
        return res.status(409).json({ error: 'Market with these parameters already exists' });
      }
    } else {
      if (markets.has(marketId)) {
        return res.status(409).json({ error: 'Market with these parameters already exists' });
      }
    }
    
    // Store market
    if (supabaseDb.supabase) {
      await supabaseDb.createMarket({
        marketId,
        eventId,
        description,
        closeTimestamp,
        creatorAddress,
        chainId,
        vault: null,
        probability: null,
      });
    } else {
      markets.set(marketId, { eventId, description, closeTimestamp, vault: null, probability: null });
    }
    
    broadcast({ type: 'market_created', marketId, eventId, description, closeTimestamp });
    res.json({ marketId });
  } catch (error) {
    console.error('Error creating market:', error);
    res.status(500).json({ error: 'Internal server error while creating market' });
  }
});

// Gas estimation endpoint
app.post('/estimate-gas', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { eventId, description, closeTimestamp } = req.body;
    
    if (!eventId || !description || !closeTimestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const factory = getContract('OracleXMarketFactory', deployed.OracleXMarketFactory);
    const gasEstimate = await factory.createMarket.estimateGas(eventId, description, closeTimestamp);
    const gasPrice = await provider.getFeeData();
    
    const estimatedCost = gasEstimate * (gasPrice.gasPrice || gasPrice.maxFeePerGas || 0n);
    const estimatedCostEth = ethers.formatEther(estimatedCost);
    
    res.json({
      gasEstimate: gasEstimate.toString(),
      gasPrice: gasPrice.gasPrice?.toString() || gasPrice.maxFeePerGas?.toString() || '0',
      estimatedCost: estimatedCost.toString(),
      estimatedCostEth,
    });
  } catch (error) {
    console.error('Error estimating gas:', error);
    res.status(500).json({ error: 'Failed to estimate gas: ' + error.message });
  }
});

app.post('/deploy-market', createMarketLimiter, async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { marketId, eventId, description, closeTimestamp } = req.body;
    
    // Validate inputs
    const validationErrors = validateMarketInput(eventId, description, closeTimestamp);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
    }
    
    // Verify market exists
    let marketExists = false;
    if (supabaseDb.supabase) {
      const market = await supabaseDb.getMarketByMarketId(marketId);
      marketExists = !!market;
    } else {
      marketExists = markets.has(marketId);
    }
    
    if (!marketExists) {
      return res.status(404).json({ error: 'Market not found. Please create the market first.' });
    }
    
    const factory = getContract('OracleXMarketFactory', deployed.OracleXMarketFactory);
    
    // Check if wallet has funds for gas
    if (wallet) {
      const balance = await provider.getBalance(await wallet.getAddress());
      if (balance === 0n) {
        return res.status(402).json({ error: 'Insufficient funds for gas. Please fund the deployer wallet.' });
      }
    } else {
      return res.status(500).json({ error: 'No deployer wallet configured' });
    }
    
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
    
    if (!vaultAddr || !onChainId) {
      // Transaction succeeded but we couldn't parse logs - this is a critical error
      const errorMsg = 'Deployment succeeded but vault address not found in logs';
      if (supabaseDb.supabase) {
        await supabaseDb.updateMarket(marketId, { deploy_error: errorMsg });
      } else {
        const m = markets.get(marketId);
        if (m) {
          m.deployError = errorMsg;
        }
      }
      throw new Error(errorMsg);
    }
    
    // Successfully deployed - update market record
    if (supabaseDb.supabase) {
      await supabaseDb.updateMarket(marketId, {
        vault_address: vaultAddr,
        market_id: onChainId, // Update to on-chain ID
        deployed_at: new Date().toISOString(),
        deploy_error: null,
      });
    } else {
      const m = markets.get(marketId) || { eventId, description, closeTimestamp };
      m.vault = vaultAddr;
      markets.delete(marketId);
      markets.set(onChainId, m);
    }
    
    broadcast({ type: 'market_deployed', marketId: onChainId, vault: vaultAddr });
    res.json({ marketId: onChainId, vault: vaultAddr });
  } catch (e) {
    console.error('Error deploying market:', e);
    // If deployment fails, mark it in database
    const { marketId } = req.body;
    if (marketId) {
      if (supabaseDb.supabase) {
        await supabaseDb.updateMarket(marketId, { deploy_error: String(e) });
      } else {
        if (markets.has(marketId)) {
          const m = markets.get(marketId);
          m.deployError = String(e);
        }
      }
    }
    res.status(500).json({ error: String(e) });
  }
});

app.post('/ai-run', async (req, res) => {
  try {
    if (!deployed) {
      if (fs.existsSync(deployedPath)) {
        deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
      } else {
        return res.status(500).json({ error: 'Contracts not deployed. Run deploy_all.js first.' });
      }
    }
    const { marketId, eventId, description, closeTimestamp } = req.body;
    if (!marketId || !eventId || !description) {
      return res.status(400).json({ error: 'Missing required fields: marketId, eventId, description' });
    }
    
    const ts = Math.floor(Date.now() / 1000);
    const chainId = await provider.getNetwork().then(n => Number(n.chainId));
    
    // Use Node.js script instead of Python for better Render compatibility
    const nodeCmd = process.execPath; // Use current Node.js executable
    const aiScript = spawn(nodeCmd, [path.join(root, 'backend', 'ai_proxy.js')]);
    
    const input = { eventId, description, timestamp: ts, chainId };
    aiScript.stdin.write(JSON.stringify(input));
    aiScript.stdin.end();
    
    let out = '';
    let errOut = '';
    aiScript.stdout.on('data', (d) => out += d.toString());
    aiScript.stderr.on('data', (d) => errOut += d.toString());
    
    aiScript.on('close', async (code) => {
      if (code !== 0) {
        console.error('AI script error:', errOut);
        return res.status(500).json({ error: `AI script failed: ${errOut || 'Unknown error'}` });
      }
      try {
        const result = JSON.parse(out);
        if (result.error) {
          return res.status(500).json({ error: result.error });
        }
        const { probability, explanation, aiHash } = result;
        
        // Convert marketId to bytes32 if it's a string
        let marketIdBytes32 = marketId;
        if (typeof marketId === 'string' && marketId.startsWith('0x')) {
          marketIdBytes32 = marketId;
        } else if (typeof marketId === 'string') {
          marketIdBytes32 = ethers.solidityPackedKeccak256(['string'], [marketId]);
        }
        
        const verifier = getContract('OracleXVerifier', deployed.OracleXVerifier);
        const tx = await verifier.commitAI(marketIdBytes32, aiHash, '');
        await tx.wait();
        
        const m = markets.get(marketId) || markets.get(marketIdBytes32) || { eventId, description, closeTimestamp };
        m.probability = probability;
        markets.set(marketId, m);
        markets.set(marketIdBytes32, m);
        
        broadcast({ type: 'ai_committed', marketId, probability, explanation, aiHash });
        res.json({ probability, explanation, aiHash });
      } catch (parseErr) {
        console.error('Failed to parse AI output:', parseErr, 'Output:', out);
        res.status(500).json({ error: `Failed to parse AI output: ${String(parseErr)}` });
      }
    });
    
    aiScript.on('error', (err) => {
      console.error('Failed to start AI script:', err);
      res.status(500).json({ error: `AI script error: ${err.message}` });
    });
  } catch (e) {
    console.error('AI Run endpoint error:', e);
    res.status(500).json({ error: String(e) });
  }
});

app.post('/allocate', async (req, res) => {
  try {
    if (!deployed) {
      if (fs.existsSync(deployedPath)) {
        deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
      } else {
        return res.status(500).json({ error: 'Contracts not deployed. Run deploy_all.js first.' });
      }
    }
    const { marketId } = req.body;
    if (!marketId) {
      return res.status(400).json({ error: 'marketId is required' });
    }
    
    // Try both marketId formats
    let m = markets.get(marketId);
    if (!m) {
      // Try as bytes32 if it's a hex string
      const marketIdBytes32 = typeof marketId === 'string' && marketId.startsWith('0x') 
        ? marketId 
        : ethers.solidityPackedKeccak256(['string'], [marketId]);
      m = markets.get(marketIdBytes32);
    }
    
    if (!m || !m.vault) {
      return res.status(404).json({ error: 'Market not found or vault not deployed' });
    }
    
    const contract = getContract('OracleXVault', m.vault);
    const usdc = getUSDCContract(deployed.USDC);
    const bal = await usdc.balanceOf(m.vault);
    
    if (bal === 0n) {
      return res.status(400).json({ error: 'Vault has no balance to allocate' });
    }
    
    const prob = (m && m.probability != null) ? m.probability : 50;
    const yesAmt = (bal * BigInt(prob)) / 100n;
    const noAmt = bal - yesAmt;
    
    const tx = await contract.allocateLiquidity(yesAmt, noAmt);
    await tx.wait();
    
    broadcast({ type: 'allocated', marketId, yesAmt: yesAmt.toString(), noAmt: noAmt.toString() });
    res.json({ yesAmt: yesAmt.toString(), noAmt: noAmt.toString() });
  } catch (e) {
    console.error('Allocate endpoint error:', e);
    res.status(500).json({ error: String(e) });
  }
});

// Chainlink Functions integration endpoint
// This endpoint should be called by Chainlink Functions DON when the market closes
// For now, this is a placeholder that can be integrated with Chainlink Functions
app.post('/settle-market', async (req, res) => {
  try {
    if (!deployed) {
      if (fs.existsSync(deployedPath)) {
        deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
      } else {
        return res.status(500).json({ error: 'Contracts not deployed. Run deploy_all.js first.' });
      }
    }
    const { marketId, winningSide } = req.body;
    if (!marketId || winningSide === undefined) {
      return res.status(400).json({ error: 'marketId and winningSide are required' });
    }
    
    if (!wallet) {
      return res.status(500).json({ error: 'Backend wallet not configured. Set PRIVATE_KEY in .env' });
    }
    
    // Find the market in our map - try both the provided marketId and as bytes32
    let marketIdBytes32 = marketId;
    let marketData = markets.get(marketId);
    
    // If market not found, try converting to bytes32
    if (!marketData) {
      if (typeof marketId === 'string' && marketId.startsWith('0x') && marketId.length === 66) {
        marketIdBytes32 = marketId;
      } else {
        // Try to find it in the map by iterating (marketId might be hex string)
        for (const [key, value] of markets.entries()) {
          if (key.toLowerCase() === marketId.toLowerCase()) {
            marketIdBytes32 = key;
            marketData = value;
            break;
          }
        }
      }
    } else {
      marketIdBytes32 = marketId;
    }
    
    // Verify the market exists and has a vault
    if (!marketData || !marketData.vault) {
      return res.status(404).json({ error: 'Market not found or vault not deployed. MarketId: ' + marketId });
    }
    
    // Verify the vault exists on-chain and check its state
    const vault = getContract('OracleXVault', marketData.vault);
    let vaultState;
    try {
      vaultState = await vault.state();
      console.log('Vault state:', vaultState, '(0=Open, 1=Locked, 2=Settled)');
    } catch (e) {
      console.error('Vault check failed:', e);
      return res.status(404).json({ error: 'Vault not found on-chain at address: ' + marketData.vault });
    }
    
    // Check if vault is already settled (state === 2)
    if (Number(vaultState) === 2) {
      try {
        const winningSideStored = await vault.winningSide();
        return res.status(400).json({ 
          error: 'Market is already settled', 
          details: `Market was already settled with winning side: ${winningSideStored === 0 ? 'NO' : 'YES'}`,
          alreadySettled: true,
          winningSide: Number(winningSideStored)
        });
      } catch (e) {
        return res.status(400).json({ 
          error: 'Market is already settled',
          alreadySettled: true
        });
      }
    }
    
    // Ensure marketIdBytes32 is a valid bytes32
    if (typeof marketIdBytes32 !== 'string' || !marketIdBytes32.startsWith('0x') || marketIdBytes32.length !== 66) {
      return res.status(400).json({ error: 'Invalid marketId format. Expected 0x-prefixed hex string of 66 characters.' });
    }
    
    const winningSideNum = Number(winningSide);
    if (winningSideNum !== 0 && winningSideNum !== 1) {
      return res.status(400).json({ error: 'winningSide must be 0 (NO) or 1 (YES)' });
    }
    
    // Call OracleAdapter directly to settle the market
    // In production, this would be called by Chainlink Functions DON
    console.log('Settling market with marketId:', marketIdBytes32, 'winningSide:', winningSideNum);
    const adapter = getContract('OracleXOracleAdapter', deployed.OracleXOracleAdapter);
    
    try {
      const tx = await adapter.pushOutcome(marketIdBytes32, winningSideNum);
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.hash);
      
      broadcast({ type: 'settled', marketId: marketIdBytes32, winningSide: winningSideNum });
      res.json({ ok: true, txHash: tx.hash });
    } catch (txError) {
      // If the error is about already settled, return a clearer message
      if (txError.reason && (txError.reason.includes('already') || txError.reason.includes('settled'))) {
        return res.status(400).json({ 
          error: 'Market is already settled',
          alreadySettled: true
        });
      }
      throw txError; // Re-throw other errors
    }
  } catch (e) {
    console.error('Settle market endpoint error:', e);
    const errorMsg = e.reason || e.message || String(e);
    res.status(500).json({ error: errorMsg, details: e.toString() });
  }
});

// Faucet endpoint removed - users must obtain USDC from testnet faucets or bridges

app.post('/deposit', async (req, res) => {
  try {
    if (!deployed) deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    const { marketId, vault, side, amount } = req.body;
    const m = markets.get(marketId);
    const v = vault || (m && m.vault);
    if (!v) throw new Error('Vault not found');
    const usdc = getUSDCContract(deployed.USDC);
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// WebSocket server - only start if not in production (Render free tier doesn't support WS well)
// In production, consider using a separate WebSocket service or polling
let wss = null;
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_WS === 'true') {
  try {
    wss = new WebSocketServer({ port: WSP });
    wss.on('listening', () => console.log(`WebSocket server on port ${WSP}`));
    wss.on('error', (err) => {
      console.warn('WebSocket server error:', err.message);
      console.warn('WebSocket features may be limited. Consider using polling or upgrade plan.');
    });
  } catch (err) {
    console.warn('Could not start WebSocket server:', err.message);
    console.warn('Real-time updates disabled. Frontend will use polling.');
  }
} else {
  console.log('WebSocket server disabled in production. Use polling for updates.');
}
