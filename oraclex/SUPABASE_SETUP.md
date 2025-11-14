# Supabase Setup Guide

This guide will help you set up Supabase for OracleX market persistence.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `oraclex` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to execute the SQL

This will create:
- `markets` table with all necessary columns
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update triggers

## Step 3: Get Your API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for frontend)
   - **service_role key** (for backend - keep this secret!)

## Step 4: Configure Environment Variables

### Backend (Render)

Add these to your Render environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Frontend (Vercel)

Add these to your Vercel environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 5: Verify Setup

1. Deploy your backend with Supabase credentials
2. Create a test market through the UI
3. Check Supabase dashboard → **Table Editor** → `markets` table
4. You should see your market record!

## Troubleshooting

### "Supabase not configured" warning
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in backend
- The app will fall back to in-memory storage if Supabase is not configured

### "Permission denied" errors
- Verify RLS policies are enabled (they should be from the schema)
- Check that you're using the correct API key (service_role for backend, anon for frontend)

### Markets not persisting
- Check backend logs for Supabase connection errors
- Verify the `markets` table exists in Supabase
- Ensure the schema was run successfully

## Security Notes

- **Never commit** your `SUPABASE_SERVICE_ROLE_KEY` to Git
- The service_role key bypasses RLS - only use it in backend/server environments
- The anon key is safe for frontend use (RLS policies protect data)
- Keep your database password secure

## Next Steps

Once Supabase is set up, markets will:
- Persist across server restarts
- Be queryable via Supabase dashboard
- Support advanced filtering and analytics
- Scale automatically with Supabase's infrastructure

