'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { querySubgraph, queries } from '@/lib/api';
import { Search, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['All', 'Crypto', 'Sports', 'Politics', 'Entertainment', 'Science', 'Other'];

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(0);

  const { data: marketsData, isLoading } = useQuery({
    queryKey: ['markets-list'],
    queryFn: () => querySubgraph<any>(queries.GET_MARKETS, {
      first: 100,
      skip: 0,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }),
    refetchInterval: 10000,
  });

  const { data: trendingData } = useQuery({
    queryKey: ['trending-markets'],
    queryFn: () => querySubgraph<any>(queries.GET_TRENDING_MARKETS, { first: 5 }),
    refetchInterval: 15000,
  });

  const markets = marketsData?.markets || [];
  const trendingMarkets = trendingData?.markets || [];

  // Filter markets
  const filteredMarkets = markets.filter((market: any) => {
    const matchesSearch = market.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         market.eventId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 0 || market.category === selectedCategory - 1;
    return matchesSearch && matchesCategory;
  });

  const activeMarkets = filteredMarkets.filter((m: any) => m.active && !m.settled);
  const settledMarkets = filteredMarkets.filter((m: any) => m.settled);

  const MarketCard = ({ market }: { market: any }) => {
    const yesPrice = Number(market.yesPrice) || 0.5;
    const noPrice = Number(market.noPrice) || 0.5;
    const totalLiquidity = Number(market.totalLiquidity) / 1e18; // Shares with 18 decimals
    const volume = Number(market.totalVolume) / 1e6; // USDC with 6 decimals
    const closeDate = new Date(Number(market.closeTimestamp) * 1000);
    const isClosingSoon = closeDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

    return (
      <Link href={`/markets/${market.marketId}`}>
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{market.description}</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{CATEGORIES[market.category + 1]}</Badge>
                  {market.settled && (
                    <Badge variant="default">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Settled
                    </Badge>
                  )}
                  {isClosingSoon && !market.settled && (
                    <Badge variant="destructive">
                      <Clock className="mr-1 h-3 w-3" />
                      Closing Soon
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Price Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                  <div className="text-sm text-muted-foreground">YES</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(yesPrice * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${(yesPrice).toFixed(3)}
                  </div>
                </div>
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                  <div className="text-sm text-muted-foreground">NO</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(noPrice * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${(noPrice).toFixed(3)}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-muted-foreground">Volume</div>
                  <div className="font-semibold">${volume.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Liquidity</div>
                  <div className="font-semibold">${totalLiquidity.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Closes</div>
                  <div className="font-semibold">
                    {closeDate.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {market.settled && market.winningSide !== null && (
                <div className="rounded-lg border-2 border-green-500 bg-green-50 p-2 text-center dark:bg-green-950">
                  <span className="font-semibold text-green-700 dark:text-green-300">
                    Outcome: {market.winningSide === 1 ? 'YES' : 'NO'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Markets</h1>
        <Link href="/create">
          <Button>Create Market</Button>
        </Link>
      </div>

      {/* Trending Markets */}
      {trendingMarkets.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Markets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trendingMarkets.slice(0, 3).map((market: any) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIES.map((category, index) => (
            <Button
              key={category}
              variant={selectedCategory === index ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(index)}
              size="sm"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Markets Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeMarkets.length})
          </TabsTrigger>
          <TabsTrigger value="settled">
            Settled ({settledMarkets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading markets...
            </div>
          ) : activeMarkets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  No active markets found
                </p>
                <Link href="/create">
                  <Button>Create First Market</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeMarkets.map((market: any) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settled" className="space-y-4">
          {settledMarkets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No settled markets yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {settledMarkets.map((market: any) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
