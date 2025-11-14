-- OracleX Markets Table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  description TEXT NOT NULL,
  close_timestamp BIGINT NOT NULL,
  vault_address TEXT,
  probability INTEGER,
  creator_address TEXT NOT NULL,
  chain_id BIGINT NOT NULL,
  deploy_error TEXT,
  gas_estimate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_markets_market_id ON markets(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_address);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_vault ON markets(vault_address) WHERE vault_address IS NOT NULL;

-- RLS (Row Level Security) - Allow public read, authenticated write
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read markets
CREATE POLICY "Public read access" ON markets
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can create markets (we'll verify wallet signature)
CREATE POLICY "Authenticated insert" ON markets
  FOR INSERT
  WITH CHECK (true); -- We'll verify wallet signature in the backend

-- Policy: Only creator or admin can update
CREATE POLICY "Creator update" ON markets
  FOR UPDATE
  USING (true); -- We'll verify ownership in the backend

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

