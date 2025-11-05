# Vercel Deployment Fix

## Issue: 404 Error

If you're seeing a 404 error on Vercel, follow these steps:

## Solution 1: Set Root Directory in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Go to **Settings** → **General**
3. Under **Root Directory**, set it to: `oraclex`
4. Click **Save**
5. Redeploy the project

## Solution 2: Manual Configuration in Vercel Dashboard

If Root Directory doesn't work, manually set these in Vercel:

1. Go to **Settings** → **General**
2. Set:
   - **Framework Preset**: Other
   - **Root Directory**: `oraclex` (or leave empty if repo root is oraclex)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `cd frontend && npm install`

3. Click **Save**
4. Go to **Deployments** tab
5. Click **Redeploy** on the latest deployment

## Solution 3: Move vercel.json to Root (if repo root is not oraclex)

If your GitHub repo root is `ZkEvm` (parent of `oraclex`):

1. Move `oraclex/vercel.json` to the repo root
2. Update paths in vercel.json:
   ```json
   {
     "buildCommand": "cd oraclex/frontend && npm install && npm run build",
     "outputDirectory": "oraclex/frontend/dist",
     "installCommand": "cd oraclex/frontend && npm install",
     "framework": null,
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

## Check Build Logs

1. Go to your deployment in Vercel
2. Click on the deployment
3. Check **Build Logs** for errors
4. Common issues:
   - Missing dependencies
   - Wrong paths
   - Build failures

## Verify Build Locally

Test the build locally to ensure it works:

```bash
cd oraclex/frontend
npm install
npm run build
ls dist  # Should see built files
```

If this works locally, the issue is likely Vercel configuration.

