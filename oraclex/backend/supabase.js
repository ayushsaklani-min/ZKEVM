import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found. Markets will not be persisted to database.');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Market database operations
export async function createMarket(marketData) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const { data, error } = await supabase
    .from('markets')
    .insert({
      market_id: marketData.marketId,
      event_id: marketData.eventId,
      description: marketData.description,
      close_timestamp: marketData.closeTimestamp,
      creator_address: marketData.creatorAddress,
      chain_id: marketData.chainId,
      vault_address: marketData.vault || null,
      probability: marketData.probability || null,
    })
    .select()
    .single();
  
  if (error) {
    // If duplicate, return existing market
    if (error.code === '23505') { // Unique violation
      const existing = await getMarketByMarketId(marketData.marketId);
      if (existing) return existing;
    }
    throw error;
  }
  
  return data;
}

export async function getMarketByMarketId(marketId) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('market_id', marketId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is OK
    throw error;
  }
  
  return data;
}

export async function getAllMarkets() {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
  
  return data || [];
}

export async function updateMarket(marketId, updates) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  
  const updateData = { ...updates };
  if (updates.deployed_at) {
    updateData.deployed_at = updates.deployed_at;
  }
  if (updates.deploy_error !== undefined) {
    updateData.deploy_error = updates.deploy_error;
  }
  
  const { data, error } = await supabase
    .from('markets')
    .update(updateData)
    .eq('market_id', marketId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function checkMarketExists(marketId) {
  if (!supabase) return false;
  
  const { data } = await supabase
    .from('markets')
    .select('market_id')
    .eq('market_id', marketId)
    .single();
  
  return !!data;
}

