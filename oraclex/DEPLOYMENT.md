# OracleX Deployment Guide

This guide will help you deploy OracleX to Vercel (frontend) and Render (backend).

## Prerequisites

1. GitHub account with your code pushed
2. Vercel account (free tier works)
3. Render account (free tier works)
4. Deployed smart contracts on Polygon zkEVM testnet
5. Environment variables ready

## Step 1: Deploy Backend to Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** → **"Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `oraclex-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:backend`
   - **Root Directory**: Leave empty (or `oraclex` if repo root is parent)

5. **Set Environment Variables** in Render dashboard:
   ```
   PRIVATE_KEY=your_wallet_private_key_here
   RPC_URL=https://polygon-amoy.infura.io/v3/YOUR_API_KEY
   BACKEND_PORT=4000
   WS_PORT=4001
   NODE_ENV=production
   ```
   Or use the public RPC:
   ```
   RPC_URL=https://rpc-amoy.polygon.technology
   ```

6. **Click "Create Web Service"**
7. **Wait for deployment** (takes 2-5 minutes)
8. **Copy your backend URL**: `https://oraclex-backend.onrender.com` (or your custom domain)

## Step 2: Deploy Frontend to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com
2. **Click "Add New..."** → **"Project"**
3. **Import your GitHub repository**
4. **Configure the project:**
   - **Framework Preset**: Vite
   - **Root Directory**: `oraclex` (or leave empty if repo root)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `cd frontend && npm install`

5. **Set Environment Variables** in Vercel dashboard (Settings → Environment Variables):
   ```
   VITE_BACKEND_URL=https://your-backend.onrender.com
   VITE_WS_URL=wss://your-backend.onrender.com
   VITE_RPC_URL=https://rpc-amoy.polygon.technology
   ```
   Replace `your-backend.onrender.com` with your actual Render backend URL.

6. **Click "Deploy"**
7. **Wait for deployment** (takes 1-3 minutes)

## Step 3: Update Backend CORS (if needed)

If you get CORS errors, the backend already has `cors({ origin: '*' })` which should work. If not, update `backend/server.js` to include your Vercel domain:

```javascript
app.use(cors({ 
  origin: ['https://your-app.vercel.app', 'http://localhost:5173']
}));
```

## Step 4: Deploy Smart Contracts (if not done)

Before the backend can work, you need deployed contracts:

1. **Set up local environment**:
   ```bash
   cd oraclex
   cp .env.example .env
   # Fill in PRIVATE_KEY and RPC_URL
   ```

2. **Deploy contracts**:
   ```bash
   npm install
   npx hardhat compile
   node scripts/deploy_all.js
   ```

3. **Copy `deployed.json`** to your repo or set contract addresses in Render environment variables

## Step 5: Verify Deployment

1. **Check backend**: Visit `https://your-backend.onrender.com/addresses`
   - Should return contract addresses

2. **Check frontend**: Visit your Vercel URL
   - Should load the dashboard

3. **Test functionality**:
   - Connect wallet
   - Create a market
   - Make deposits
   - Run AI and allocate

## Troubleshooting

### Backend Issues

**Problem**: Backend fails to start
- Check Render logs for errors
- Verify `PRIVATE_KEY` and `RPC_URL` are set correctly
- Ensure `deployed.json` exists or contracts are configured

**Problem**: WebSocket not working
- Render free tier has limited WebSocket support
- Frontend will fall back to polling
- To enable WebSocket, set `ENABLE_WS=true` in Render env vars

**Problem**: Python script errors
- Render needs Python installed
- Add Python buildpack or use Node-only solution
- Consider rewriting `ai_proxy.py` in JavaScript

### Frontend Issues

**Problem**: Can't connect to backend
- Verify `VITE_BACKEND_URL` is correct in Vercel
- Check backend is running on Render
- Verify CORS settings

**Problem**: Build fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify Node version (use 18+)

### Contract Issues

**Problem**: Contracts not found
- Upload `deployed.json` to Render
- Or set contract addresses as environment variables
- Re-deploy contracts if needed

## Environment Variables Reference

### Backend (Render)
- `PRIVATE_KEY` - Wallet private key (starts with 0x)
- `RPC_URL` - Polygon zkEVM testnet RPC endpoint
- `BACKEND_PORT` - Port number (Render sets PORT automatically)
- `WS_PORT` - WebSocket port (optional)
- `NODE_ENV` - Set to `production`

### Frontend (Vercel)
- `VITE_BACKEND_URL` - Full backend URL (https://...)
- `VITE_WS_URL` - WebSocket URL (wss://...)
- `VITE_RPC_URL` - Blockchain RPC URL

## Notes

- **Free tier limitations**: 
  - Render free tier services spin down after 15 minutes of inactivity
  - First request after spin-down takes 30-60 seconds
  - Consider upgrading for production use

- **WebSocket**: 
  - Render free tier has limited WebSocket support
  - Frontend automatically falls back to polling if WebSocket fails
  - For production, consider using a dedicated WebSocket service

- **Smart Contracts**:
  - Contracts must be deployed before backend can function
  - Keep `deployed.json` updated or use environment variables

## Next Steps

1. Set up custom domains (optional)
2. Configure monitoring/logging
3. Set up automated deployments
4. Add error tracking (Sentry, etc.)
5. Optimize for production performance

