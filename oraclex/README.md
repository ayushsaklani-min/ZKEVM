# OracleX — Autonomous AI Liquidity Layer

Autonomous AI Liquidity Layer MVP for prediction markets on Polygon Amoy testnet.

## 🚀 Features

- **Smart Contracts**: Factory, Vault, Verifier, and Oracle Adapter deployed on Polygon Amoy
- **Backend API**: Node.js/Express server with WebSocket support
- **Frontend**: React + Vite + Wagmi + RainbowKit dashboard
- **AI Integration**: Deterministic AI probability calculation with on-chain commitments
- **Real USDC**: Integrated with Polygon Amoy USDC token
- **Supabase Integration**: Persistent database storage for markets (optional)
- **Production Ready**: Wallet authentication, gas estimation, content moderation, rate limiting

## 📋 Prerequisites

- Node.js 18+
- npm 9+
- Hardhat (via npx)
- Polygon Amoy testnet access

## 🏃 Quick Start

### 1. Install Dependencies

```bash
cd oraclex
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
- `PRIVATE_KEY` - Your wallet private key
- `RPC_URL` - Polygon Amoy RPC endpoint

### 3. Deploy Contracts

```bash
npx hardhat compile
node scripts/deploy_all.js
```

This creates `deployed.json` with contract addresses.

### 4. Start Development Servers

**Backend:**
```bash
npm run start:backend
```

**Frontend (new terminal):**
```bash
npm run start:frontend
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173

## 🌐 Deployment

### Backend (Render)

1. Push code to GitHub
2. Create Web Service on Render
3. Connect GitHub repository
4. Set build command: `npm ci`
5. Set start command: `npm run start:backend`
6. Add environment variables:
   - `PRIVATE_KEY`
   - `RPC_URL`
   - `USDC_ADDRESS=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
   - `NODE_ENV=production`

### Frontend (Vercel)

1. Import GitHub repository
2. Set root directory: `oraclex` (if needed)
3. Build command: `cd frontend && npm ci && npm run build`
4. Output directory: `frontend/dist`
5. Add environment variables:
   - `VITE_BACKEND_URL` - Your Render backend URL
   - `VITE_WS_URL` - WebSocket URL (wss://...)
   - `VITE_RPC_URL` - Polygon Amoy RPC

## 📁 Project Structure

```
oraclex/
├── contracts/          # Smart contracts
├── backend/            # Node.js API server
│   ├── server.js       # Express server
│   └── ai_proxy.js     # AI probability calculator
├── frontend/           # React frontend
│   └── src/
│       ├── pages/      # Dashboard & Market views
│       └── components/ # UI components
├── scripts/            # Deployment scripts
│   └── deploy_all.js   # Contract deployment
├── artifacts/          # Compiled contract ABIs
├── deployed.json       # Contract addresses
├── vercel.json        # Vercel configuration
└── render.yaml        # Render configuration
```

## 🔧 Environment Variables

### Backend
- `PRIVATE_KEY` - Wallet private key (0x...)
- `RPC_URL` - Polygon Amoy RPC endpoint
- `USDC_ADDRESS` - USDC token address (default: Polygon Amoy)
- `BACKEND_PORT` - Server port (default: 4000)
- `WS_PORT` - WebSocket port (default: 4001)
- `NODE_ENV` - Environment (development/production)
- `SUPABASE_URL` - Supabase project URL (optional, for database persistence)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (optional, for backend)

### Frontend
- `VITE_BACKEND_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL
- `VITE_RPC_URL` - Blockchain RPC URL
- `VITE_SUPABASE_URL` - Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (optional)

**Note**: Supabase is optional. Without it, markets are stored in memory (lost on restart). See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for setup instructions.

## 🎯 Usage

1. **Create Market**: Use backend API or frontend UI
2. **Deploy Market**: Deploy on-chain vault
3. **Run AI**: Calculate probability and commit hash
4. **Deposit**: Users deposit USDC into YES/NO pools
5. **Allocate**: Distribute liquidity based on AI probability
6. **Settle**: Market settles when close timestamp reached

## 🔗 API Endpoints

- `GET /health` - Health check
- `GET /addresses` - Contract addresses
- `GET /markets` - List all markets
- `POST /create-market` - Create new market (requires wallet signature)
- `POST /deploy-market` - Deploy market on-chain
- `POST /estimate-gas` - Estimate gas cost for market deployment
- `POST /ai-run` - Run AI and commit hash
- `POST /allocate` - Allocate liquidity
- `POST /settle-market` - Settle market
- `POST /deposit` - Deposit USDC

## 📝 Notes

- This MVP is unaudited; do not use in production
- Uses real USDC on Polygon Amoy testnet
- Market settlement can be manual (testing) or via Chainlink Functions (production)
- Free tier Render services may spin down after inactivity
- Supabase integration provides persistent storage (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- Market creation requires wallet connection and message signing for authentication
- Content moderation filters inappropriate language and spam patterns

## 📄 License

MIT
