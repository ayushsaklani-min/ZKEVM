# OracleX — MVP

Autonomous AI Liquidity Layer MVP for prediction markets on Polygon zkEVM testnet.

## 🚀 Quick Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel (frontend) and Render (backend).

## What it does
- Detects a trending event (simulated)
- Deploys a market + isolated USDC vault
- Accepts deposits (YES/NO) and allocates based on AI probability
- Commits deterministic AI hash (aiHash) on-chain via Verifier
- Settles via MockChainlink -> OracleAdapter
- React dashboard shows markets, AI prob, deposit UI, vault stats

## Quickstart
Prereqs: Node 18+, npm, Python3, Hardhat (npx OK)

```bash
cd oraclex
cp .env.example .env
# Fill PRIVATE_KEY and RPC_URL
npm install
npx hardhat compile
node scripts/deploy_all.js
npm run start:backend &
(cd frontend && npm install && npm run dev) &
node scripts/demo_flow.js
```

Backend: `http://localhost:4000` (WS `ws://localhost:4001`)
Frontend: `http://localhost:5173`

## Deposits from UI
1) Open Dashboard → pick a market → MarketView
2) Connect wallet (RainbowKit)
3) Click “Get 1,000 mUSDC Faucet” (from backend) to fund your address
4) Choose side (YES/NO), enter amount (USDC, 6 decimals handled), click “Deposit”
5) Run AI → Allocate → Simulate Outcome (for demo)

## Environment
```
PRIVATE_KEY=0x...
RPC_URL=https://...
BACKEND_PORT=4000
WS_PORT=4001
VITE_BACKEND_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4001
VITE_RPC_URL=https://rpc.public.zkevm-test.net
```

## Replace MockChainlink with Chainlink Functions
Swap `/simulate-outcome` for a Functions call; DON calls `OracleXOracleAdapter.pushOutcome(marketId, side)`.

## Tests
- Solidity unit test (`test/OracleXVault.t.sol`) showing core flows
- JS placeholder integration test (`test/full_flow.test.js`)

## CI
- GitHub Actions: compile contracts, placeholder JS tests, frontend build

## Notes
- This MVP is unaudited; do not use in production.
