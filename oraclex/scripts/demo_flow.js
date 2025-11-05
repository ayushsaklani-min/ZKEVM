import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function main() {
  const deployedPath = path.join(root, 'deployed.json');
  if (!fs.existsSync(deployedPath)) throw new Error('Missing deployed.json. Run scripts/deploy_all.js');
  const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));

  const backend = process.env.BACKEND_URL || 'http://localhost:4000';

  // Create sample market
  const eventId = 'ETH>4000-2025-12-01';
  const description = 'ETH > $4k by 2025-12-01';
  const closeTimestamp = Math.floor(Date.now() / 1000) + 60; // 1 min in future for demo

  console.log('Creating market via backend...');
  const createRes = await axios.post(`${backend}/create-market`, { eventId, description, closeTimestamp });
  const { marketId } = createRes.data;
  console.log('MarketId:', marketId);

  console.log('Deploying market on-chain...');
  const deployRes = await axios.post(`${backend}/deploy-market`, { marketId, eventId, description, closeTimestamp });
  const { vault } = deployRes.data;
  console.log('Vault:', vault);

  console.log('Running deterministic AI...');
  const aiRes = await axios.post(`${backend}/ai-run`, { marketId, eventId, description, closeTimestamp });
  const { probability, explanation, aiHash } = aiRes.data;
  console.log('AI probability:', probability, '%', 'hash:', aiHash);

  // fund demo wallet and deposit into both sides
  console.log('Faucet 10,000 mUSDC to deployer (backend signer)...');
  await axios.post(`${backend}/faucet`, { to: deployed.deployer, amount: String(10_000n * 10n ** 6n) });

  console.log('Depositing YES 4,000 and NO 6,000...');
  await axios.post(`${backend}/deposit`, { marketId, vault, side: 1, amount: String(4_000n * 10n ** 6n) });
  await axios.post(`${backend}/deposit`, { marketId, vault, side: 0, amount: String(6_000n * 10n ** 6n) });

  console.log('Allocating liquidity based on probability...');
  const allocRes = await axios.post(`${backend}/allocate`, { marketId, vault });
  console.log('Allocation:', allocRes.data);

  console.log('Simulating outcome after close...');
  const outcomeRes = await axios.post(`${backend}/simulate-outcome`, { marketId, winningSide: probability >= 50 ? 1 : 0 });
  console.log('Outcome posted:', outcomeRes.data);

  console.log('Demo flow complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
