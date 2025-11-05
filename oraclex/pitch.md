OracleX — Autonomous AI Liquidity Layer for Prediction Markets (MVP)

What OracleX is
- An on-chain liquidity layer that auto-creates markets for trending events and allocates vault liquidity based on a deterministic AI signal.
- Built for Polygon zkEVM testnet (Amoy). Fully open-source; clear path to Chainlink Functions & zkML upgrades.

Why this wins
- Deterministic AI: Transparent, reproducible signals avoid black-box trust. Commitments (aiHash) are stored on-chain.
- Instant markets: A factory deploys isolated USDC vaults per market, enabling safe TVL and clean accounting.
- Capital efficiency: Programmatic allocation to YES/NO uses market priors (probability) to improve liquidity distribution.
- Smooth UX: Minimal backend, modern React dashboard, one-click demo script.

What’s live in the MVP
- Contracts: Factory, Vault, Verifier (AI commitments), Oracle adapter, mocks (USDC, Chainlink).
- Backend: REST + WS plus deterministic Python ai_proxy (seeded hashing rules).
- Frontend: Vite + React + Wagmi + RainbowKit. Shows markets, AI probability, deposit UI, vault stats.
- Automation: Scripts to deploy contracts, run an end-to-end demo, and simulate an outcome.

Go-to-market wedge
- Start with crypto + sports events where on-chain users already participate.
- Partner with small prediction dApps lacking robust market-making; supply the “AI Liquidity Layer” as a service.

Moat over time
- Upgrade Verifier with zkML proofs to attest signal provenance without revealing internals.
- Replace MockChainlink with Chainlink Functions for trust-minimized outcome submission.
- Add risk engine and dynamic reallocation strategies (Kelly sizing, inventory control).

Next steps to scale
1) Integrate real data feeds and a more sophisticated (still deterministic) feature pipeline.
2) Multi-market portfolio management and drawdown guards.
3) Programmatic fee model and revenue sharing with partner frontends.
4) Permissionless market creation + curation layer.

Why now
- On-chain prediction markets are resurging; AI-native liquidity is the missing piece for depth and tight spreads.



