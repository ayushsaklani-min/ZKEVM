'use client';

import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { CONTRACTS } from '@/config/contracts';
import { MARKET_FACTORY_ABI, PREDICTION_AMM_ABI } from '@/lib/abis';

export function useMarketDetail(marketId: string) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['market-detail', marketId],
    queryFn: async () => {
      if (!publicClient || !marketId) return null;

      try {
        // Get market data from MarketFactory
        const marketData = await publicClient.readContract({
          address: CONTRACTS.MarketFactory,
          abi: MARKET_FACTORY_ABI,
          functionName: 'getMarket',
          args: [marketId as `0x${string}`],
        }) as any;

        // Get pool state from PredictionAMM
        const ammData = await publicClient.readContract({
          address: CONTRACTS.PredictionAMM,
          abi: PREDICTION_AMM_ABI,
          functionName: 'markets',
          args: [marketId as `0x${string}`],
        }) as any;

        // Calculate prices
        const yesReserve = Number(ammData[0]) / 1e18;
        const noReserve = Number(ammData[1]) / 1e18;
        const totalReserve = yesReserve + noReserve;
        
        const yesPrice = totalReserve > 0 ? noReserve / totalReserve : 0.5;
        const noPrice = totalReserve > 0 ? yesReserve / totalReserve : 0.5;

        return {
          id: marketId,
          eventId: marketData[0],
          description: marketData[1],
          category: Number(marketData[2]),
          creator: marketData[3],
          closeTimestamp: marketData[4],
          resolutionTimestamp: marketData[5],
          active: marketData[6],
          settled: marketData[7],
          winningSide: marketData[8],
          yesPrice,
          noPrice,
          yesReserve: ammData[0],
          noReserve: ammData[1],
          totalLiquidity: ammData[2],
          totalVolume: ammData[3],
          trades: [], // We don't have trade history without subgraph
        };
      } catch (error) {
        console.error('Error fetching market detail:', error);
        return null;
      }
    },
    enabled: !!publicClient && !!marketId,
    refetchInterval: 5000,
  });
}
