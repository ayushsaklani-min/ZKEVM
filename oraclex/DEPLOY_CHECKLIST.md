# Deployment Checklist

Use this checklist before deploying to ensure everything is ready.

## Pre-Deployment

- [ ] **Smart Contracts Deployed**
  - [ ] Run `npx hardhat compile`
  - [ ] Run `node scripts/deploy_all.js`
  - [ ] Verify `deployed.json` exists with all contract addresses
  - [ ] Test contracts on testnet

- [ ] **Environment Variables Prepared**
  - [ ] `PRIVATE_KEY` - Wallet private key (starts with 0x)
  - [ ] `RPC_URL` - Polygon zkEVM testnet RPC endpoint
  - [ ] Backend URL (after Render deployment)
  - [ ] Frontend URLs (after Vercel deployment)

- [ ] **Code Review**
  - [ ] All sensitive data removed (private keys, API keys)
  - [ ] `.env` file is in `.gitignore`
  - [ ] `deployed.json` is in `.gitignore` (or contains only public addresses)
  - [ ] No hardcoded localhost URLs in production code

## Backend (Render) Deployment

- [ ] **Repository Setup**
  - [ ] Code pushed to GitHub
  - [ ] Repository is public or Render has access

- [ ] **Render Configuration**
  - [ ] Create new Web Service
  - [ ] Connect GitHub repository
  - [ ] Set build command: `npm install`
  - [ ] Set start command: `npm run start:backend`
  - [ ] Root directory: Leave empty (or `oraclex` if needed)

- [ ] **Environment Variables in Render**
  - [ ] `PRIVATE_KEY` = Your wallet private key
  - [ ] `RPC_URL` = Polygon testnet RPC
  - [ ] `NODE_ENV` = `production`
  - [ ] `BACKEND_PORT` = `4000` (optional, Render sets PORT)
  - [ ] `WS_PORT` = `4001` (optional)

- [ ] **Deploy**
  - [ ] Click "Create Web Service"
  - [ ] Wait for build to complete
  - [ ] Check logs for errors
  - [ ] Test: Visit `https://your-app.onrender.com/health`
  - [ ] Test: Visit `https://your-app.onrender.com/addresses`

- [ ] **Post-Deployment**
  - [ ] Copy backend URL
  - [ ] Note: Free tier spins down after 15 min inactivity
  - [ ] First request after spin-down takes 30-60 seconds

## Frontend (Vercel) Deployment

- [ ] **Vercel Configuration**
  - [ ] Import GitHub repository
  - [ ] Framework: Vite
  - [ ] Root Directory: `oraclex` (or leave empty)
  - [ ] Build Command: `cd frontend && npm install && npm run build`
  - [ ] Output Directory: `frontend/dist`

- [ ] **Environment Variables in Vercel**
  - [ ] `VITE_BACKEND_URL` = `https://your-backend.onrender.com`
  - [ ] `VITE_WS_URL` = `wss://your-backend.onrender.com` (or `ws://` if not HTTPS)
  - [ ] `VITE_RPC_URL` = `https://rpc-amoy.polygon.technology`

- [ ] **Deploy**
  - [ ] Click "Deploy"
  - [ ] Wait for build to complete
  - [ ] Check build logs for errors
  - [ ] Test: Visit your Vercel URL

- [ ] **Post-Deployment**
  - [ ] Test wallet connection
  - [ ] Test market creation
  - [ ] Test deposits
  - [ ] Verify API calls work

## Known Issues & Solutions

### Python Script on Render
**Issue**: Render may not have Python installed by default.

**Solutions**:
1. **Option A**: Add Python buildpack in Render
   - Go to Render dashboard → Your service → Settings
   - Add buildpack: `heroku/python`

2. **Option B**: Convert to JavaScript (recommended)
   - The `ai_proxy.py` logic can be rewritten in Node.js
   - This avoids Python dependency

3. **Option C**: Use external API
   - Call an external service for AI predictions
   - Simplifies deployment

### WebSocket on Render Free Tier
**Issue**: Free tier has limited WebSocket support.

**Solution**: 
- Frontend automatically falls back to polling
- No action needed - it's handled in code
- To enable WebSocket, set `ENABLE_WS=true` in Render env vars

### CORS Issues
**Issue**: Frontend can't connect to backend.

**Solution**:
- Backend already has `cors({ origin: '*' })`
- If issues persist, update to specific domains:
  ```javascript
  app.use(cors({ 
    origin: ['https://your-app.vercel.app']
  }));
  ```

### Contract Artifacts Missing
**Issue**: Backend can't find contract ABIs.

**Solution**:
- Ensure `artifacts/` folder is in repository
- Or compile contracts before deployment
- Or upload artifacts separately

## Testing After Deployment

1. **Backend Health Check**
   ```bash
   curl https://your-backend.onrender.com/health
   ```

2. **Backend Addresses**
   ```bash
   curl https://your-backend.onrender.com/addresses
   ```

3. **Frontend Loads**
   - Visit Vercel URL
   - Should see dashboard

4. **Full Flow Test**
   - Connect wallet
   - Create market
   - Make deposit
   - Run AI
   - Allocate
   - Simulate outcome

## Rollback Plan

If deployment fails:

1. **Backend**: 
   - Check Render logs
   - Verify environment variables
   - Re-deploy previous commit

2. **Frontend**:
   - Check Vercel build logs
   - Verify environment variables
   - Re-deploy previous commit

## Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Check logs in respective dashboards

