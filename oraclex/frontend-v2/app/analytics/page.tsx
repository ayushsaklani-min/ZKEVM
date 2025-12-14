'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-8">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-8">
        <div className="text-center">
          <div className="mb-4 text-lg">No data available</div>
        </div>
      </div>
    );
  }

  const marketData = analytics.markets || [];

  // Calculate category distribution
  const categoryNames = ['Sports', 'Politics', 'Crypto', 'Entertainment', 'Science', 'Other'];
  const categoryData = categoryNames
    .map((name, index) => ({
      name,
      value: marketData.filter((m: any) => m.category === index).length,
    }))
    .filter(c => c.value > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Volume over time (simplified since we don't have timestamps)
  const volumeData = marketData.map((m: any, i: number) => ({
    market: `Market ${i + 1}`,
    volume: Number(m.totalVolume) / 1e6,
    cumulative: marketData.slice(0, i + 1).reduce((sum: number, market: any) => sum + Number(market.totalVolume) / 1e6, 0)
  }));

  // Top markets by volume
  const topMarkets = [...marketData]
    .sort((a: any, b: any) => Number(b.totalVolume) - Number(a.totalVolume))
    .slice(0, 10)
    .map((m: any) => ({
      name: m.description.substring(0, 30) + '...',
      volume: Number(m.totalVolume) / 1e6
    }));

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Analytics Dashboard</h1>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Markets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMarkets}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeMarkets} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(analytics.totalVolume / 1e6).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              USDC traded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liquidity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(analytics.totalLiquidity / 1e18).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Volume</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.totalMarkets > 0 ? (analytics.totalVolume / 1e6 / analytics.totalMarkets).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per market
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Volume Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {volumeData.length > 0 ? (
                <AreaChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="market" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cumulative" stroke="#8884d8" fill="#8884d8" name="Cumulative Volume (USDC)" />
                </AreaChart>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No volume data yet
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Markets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {categoryData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No markets yet
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Markets by Volume */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Markets by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              {topMarkets.length > 0 ? (
                <BarChart data={topMarkets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" fill="#8884d8" name="Volume (USDC)" />
                </BarChart>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No markets with volume yet
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
