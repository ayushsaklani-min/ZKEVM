# 🔮 OracleX V2 - Production Ready

> A fully integrated decentralized prediction market platform powered by AI oracles, automated market makers, and The Graph indexing

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22-yellow)](https://hardhat.org/)

## 🌟 Overview

OracleX is a next-generation prediction market platform that combines decentralized finance with AI-powered insights. Built on Polygon, it enables users to create, trade, and settle prediction markets with automated market making, governance participation, and transparent fee distribution.

## ✨ Key Features

### 🎯 Prediction Markets
- **AMM-Based Trading**: Automated market maker for efficient price discovery
- **Market Creation**: Anyone can create prediction markets with customizable parameters
- **Position Management**: Buy and sell YES/NO positions with real-time pricing
- **AI Insights**: Chainlink-powered AI oracle provides market analysis and predictions

### �️ Governantce
- **ORX Token**: Native governance token for platform participation
- **veORX Staking**: Vote-escrowed tokens for enhanced governance rights
- **On-Chain Voting**: Decentralized proposal creation and voting system
- **Treasury Management**: Community-controlled protocol treasury

### 💰 Economics
- **Fee Distribution**: Automated fee collection and distribution to stakeholders
- **Treasury System**: Protocol-owned liquidity and reserve management
- **Staking Rewards**: Earn rewards by locking ORX tokens
- **USDC Settlement**: All markets settle in USDC for stability

### 🔐 Security & Verification
- **Oracle Verification**: Multi-layered oracle system for accurate market settlement
- **Chainlink Integration**: Decentralized oracle network for external data
- **Admin Controls**: Emergency pause and system management capabilities
- **Audited Contracts**: Comprehensive test coverage and security measures

## 🏗️ Architecture

```
oraclex/
├── contracts-v2/           # Smart contracts (Solidity 0.8.24)
│   ├── ORXToken.sol       # Governance token
│   ├── veORX.sol          # Vote-escrowed token
│   ├── PredictionAMM.sol  # Automated market maker
│   ├── MarketFactoryV2.sol # Market creation
│   ├── MarketPositions.sol # Position tracking
│   ├── Governance.sol     # On-chain governance
│   ├── Treasury.sol       # Protocol treasury
│   └── FeeDistributor.sol # Fee distribution
│
├── frontend-v2/           # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and ABIs
│
├── chainlink-functions/  # Chainlink oracle functions
│   ├── ai-oracle.js     # AI-powered insights
│   └── settlement-oracle.js # Market settlement
│
├── scripts-v2/          # Deployment and utility scripts
├── test-v2/            # Contract tests
└── supabase/           # Off-chain data storage
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MetaMask or compatible Web3 wallet
- Polygon Amoy testnet MATIC (for testing)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/oraclex.git
cd oraclex
```

2. Install dependencies
```bash
npm install
cd frontend-v2 && npm install
```

3. Configure environment variables
```bash
# Root .env
cp .env.example .env
# Add your private key, RPC URL, and API keys

# Frontend .env.local
cd frontend-v2
cp .env.example .env.local
# Add contract addresses and configuration
```

### Smart Contract Development

Compile contracts:
```bash
npm run compile:v2
```

Run tests:
```bash
npm run test:hh
```

Deploy to Polygon Amoy:
```bash
npx hardhat run scripts-v2/deploy-v2.js --network amoy
```

### Frontend Development

Start the development server:
```bash
npm run start:frontend
```

Build for production:
```bash
npm run build:frontend
```

The application will be available at `http://localhost:3000`

## 📦 Tech Stack

### Smart Contracts
- **Solidity 0.8.24**: Smart contract language
- **Hardhat**: Development environment
- **OpenZeppelin**: Security-audited contract libraries
- **Chainlink**: Decentralized oracle network

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **RainbowKit**: Wallet connection
- **Wagmi & Viem**: Ethereum interactions
- **Recharts**: Data visualization
- **Framer Motion**: Animations

### Backend & Infrastructure
- **Supabase**: Off-chain data storage
- **Polygon**: Layer 2 blockchain
- **IPFS**: Decentralized storage (planned)

## 🎮 Usage

### Creating a Market

1. Connect your wallet
2. Navigate to "Create Market"
3. Define your prediction question
4. Set market parameters (duration, category, etc.)
5. Deposit initial liquidity
6. Submit transaction

### Trading Positions

1. Browse available markets
2. Select a market to view details
3. Choose YES or NO position
4. Enter trade amount
5. Review price impact and fees
6. Execute trade

### Governance Participation

1. Acquire ORX tokens
2. Lock tokens to receive veORX
3. Browse active proposals
4. Vote on proposals
5. Earn staking rewards

## 🔧 Configuration

### Network Configuration

The platform supports multiple networks:
- **Hardhat**: Local development (chainId: 31337)
- **Polygon Amoy**: Testnet (chainId: 80002)
- **Polygon Mainnet**: Production (chainId: 137)

### Contract Addresses

#### Polygon Amoy Testnet (ChainID: 80002)

| Contract | Address | Explorer |
|----------|---------|----------|
| ORX Token | `0xf5f5424A78657E374F1018307c07323696e3A6b3` | [View](https://amoy.polygonscan.com/address/0xf5f5424A78657E374F1018307c07323696e3A6b3) |
| veORX | `0x351dA233FaF06B43440E35EE6d48721bfBD3Ca92` | [View](https://amoy.polygonscan.com/address/0x351dA233FaF06B43440E35EE6d48721bfBD3Ca92) |
| Market Factory | `0x82032757239F37E6c42D5098c115EcD67Ce587A7` | [View](https://amoy.polygonscan.com/address/0x82032757239F37E6c42D5098c115EcD67Ce587A7) |
| Market Positions | `0x81282b3d5acA181c27028e57917D18145abf1be4` | [View](https://amoy.polygonscan.com/address/0x81282b3d5acA181c27028e57917D18145abf1be4) |
| Prediction AMM | `0x6A3b46fb08eb31e2811d447EEd0550b5d66c3487` | [View](https://amoy.polygonscan.com/address/0x6A3b46fb08eb31e2811d447EEd0550b5d66c3487) |
| Treasury | `0xE0880C17bE8c6c5dd5611440299A4e5d223a488f` | [View](https://amoy.polygonscan.com/address/0xE0880C17bE8c6c5dd5611440299A4e5d223a488f) |
| Fee Distributor | `0x53756cfd49Cc9354C10cafddD0d6a63Fe77a6bdf` | [View](https://amoy.polygonscan.com/address/0x53756cfd49Cc9354C10cafddD0d6a63Fe77a6bdf) |
| Oracle Adapter | `0xEF765a5524558A6aDB5ACECD936373c0182eE6Fc` | [View](https://amoy.polygonscan.com/address/0xEF765a5524558A6aDB5ACECD936373c0182eE6Fc) |
| Verifier | `0x40365fbda82Fa5284B5Ae8d9458d77737c423112` | [View](https://amoy.polygonscan.com/address/0x40365fbda82Fa5284B5Ae8d9458d77737c423112) |
| USDC (Testnet) | `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` | [View](https://amoy.polygonscan.com/address/0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582) |

These addresses are configured in `frontend-v2/.env.local` and are deployed on Polygon Amoy testnet for testing purposes.

## 🧪 Testing

Run the full test suite:
```bash
npm run test:hh
```

Generate gas reports:
```bash
REPORT_GAS=true npm run test:hh
```

Check contract sizes:
```bash
npm run compile:v2
```

## 📊 Smart Contract Features

### PredictionAMM
- Constant product market maker (x * y = k)
- Dynamic fee adjustment based on liquidity
- Slippage protection
- Position minting and burning

### Governance
- Proposal creation with minimum veORX threshold
- Time-locked voting periods
- Quorum requirements
- Execution delays for security

### Treasury
- Multi-signature controls
- Fee collection from all markets
- Strategic reserve management
- Emergency withdrawal capabilities

## 🛣️ Roadmap

- [ ] Multi-chain deployment (Arbitrum, Optimism)
- [ ] Advanced market types (scalar, categorical)
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
- [ ] Enhanced AI oracle capabilities
- [ ] Liquidity mining programs
- [ ] Cross-chain bridge integration

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows existing style conventions
- All tests pass
- New features include tests
- Documentation is updated

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live App (Vercel)**: [https://zkevm-eta.vercel.app/](https://zkevm-eta.vercel.app/)
- **Live App (Render)**: [https://zkevm-1.onrender.com/](https://zkevm-1.onrender.com/)

## 🙏 Acknowledgments

- OpenZeppelin for secure contract libraries
- Chainlink for decentralized oracle infrastructure
- Polygon for scalable blockchain infrastructure
- The entire DeFi and prediction market community

---

Built for polygon by the ayushsaklani
