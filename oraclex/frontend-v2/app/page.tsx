'use client';

import { useState } from 'react';
import { MarketCard } from '@/components/markets/MarketCard';
import { MarketFilters } from '@/components/markets/MarketFilters';
import { MarketSearch } from '@/components/markets/MarketSearch';
import { useMarkets, useTrendingMarkets } from '@/hooks/useMarkets';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Market } from '@/types';

export default function HomePage() {
  const { data: markets, isLoading } = useMarkets();
  const { data: trendingMarkets } = useTrendingMarkets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredMarkets: Market[] = (markets || []).filter((market: Market) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !market.description.toLowerCase().includes(query) &&
        !market.eventId.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== null && market.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active' && market.status !== 'active') return false;
      if (selectedStatus === 'settled' && market.status !== 'settled') return false;
      if (selectedStatus === 'closing' && market.closeTimestamp > Date.now() / 1000 + 86400) return false;
    }

    return true;
  });

  return (
    <div className="container py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Trade on the Future with{' '}
          <span className="text-gradient">Real AI</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Decentralized prediction markets powered by AI on Polygon. Trade YES/NO on real-world events.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <MarketSearch value={searchQuery} onChange={setSearchQuery} />
        <MarketFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            All Markets
          </TabsTrigger>
          <TabsTrigger value="trending" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="closing" className="gap-2">
            <Clock className="h-4 w-4" />
            Closing Soon
          </TabsTrigger>
          <TabsTrigger value="settled" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Settled
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : filteredMarkets && filteredMarkets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMarkets.map((market) => (
                <MarketCard key={market.marketId} market={market} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No markets found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          {trendingMarkets && trendingMarkets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trendingMarkets.map((market) => (
                <MarketCard key={market.marketId} market={market} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No trending markets</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closing" className="space-y-4">
          {filteredMarkets
            ?.filter((m) => m.closeTimestamp < Date.now() / 1000 + 86400)
            .map((market) => (
              <MarketCard key={market.marketId} market={market} />
            ))}
        </TabsContent>

        <TabsContent value="settled" className="space-y-4">
          {filteredMarkets
            ?.filter((m) => m.status === 'settled')
            .map((market) => (
              <MarketCard key={market.marketId} market={market} />
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
