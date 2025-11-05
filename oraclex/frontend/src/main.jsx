import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import App from './App'
import Dashboard from './pages/Dashboard'
import MarketView from './pages/MarketView'

const config = getDefaultConfig({
  appName: 'OracleX',
  projectId: 'oraclex-demo',
  chains: [{ 
    id: 80002, 
    name: 'Polygon Amoy', 
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: { 
      default: { 
        http: [import.meta.env.VITE_RPC_URL || 'https://rpc-amoy.polygon.technology'] 
      } 
    },
    blockExplorers: {
      default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' }
    }
  }],
  ssr: false,
})

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Dashboard /> },
    { path: '/market/:id', element: <MarketView /> },
  ]}
])

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}> 
          <RouterProvider router={router} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
