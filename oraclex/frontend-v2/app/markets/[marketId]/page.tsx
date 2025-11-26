'use client';

import { useMarket } from '@/hooks/useMarkets';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { PriceChart } from '@/components/markets/PriceChart';
import { TradingInterface } from '@/components/trading/TradingInterface';
import { YourPositions } from '@/components/trading/YourPositions';
import { MarketStats } from '@/components/markets/MarketStats';
import { RecentTrades } from '@/components/markets/RecentTrades';
import { AIInsights } from '@/components/markets/AIInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { use } from 'react';

export default function MarketPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = use(params);
  const { data: market, isLoading, error } = useMarket(marketId);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Market not found or failed to load. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Market Info + Chart */}
        <div className="lg:col-span-2 space-y-6">
          <MarketHeader market={market} />
          <PriceChart marketId={marketId} />
          
          {market.aiExplanation && (
            <AIInsights market={market} />
          )}
          
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Market Description</h2>
            <p className="text-muted-foreground">{market.description}</p>
            
            {market.tags && market.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {market.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Trading Interface */}
        <div className="space-y-6">
          <TradingInterface marketId={marketId} market={market} />
          <YourPositions marketId={marketId} />
          <MarketStats market={market} />
        </div>
      </div>

      {/* Bottom: Recent Activity */}
      <div className="mt-8">
        <RecentTrades marketId={marketId} />
      </div>
    </div>
  );
}
