import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function Dashboard() {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await axios.get(`${backend}/markets`)
        setMarkets(res.data || [])
      } catch (err) {
        console.error('Failed to load markets:', err)
        setError('Failed to load markets. Make sure the backend server is running.')
      } finally {
        setLoading(false)
      }
    }
    load()
    
    let ws
    const wsUrl = import.meta.env.VITE_WS_URL
    // Only connect to WebSocket if URL is provided and not in production issues
    if (wsUrl && (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://'))) {
      try {
        ws = new WebSocket(wsUrl)
        ws.onmessage = (msg) => {
          try { 
            const d = JSON.parse(msg.data)
            if (d.type && d.type.includes('market')) load()
          } catch (_) {}
        }
        ws.onerror = () => {
          // Silently handle WebSocket errors - will use polling instead
        }
        ws.onclose = () => {
          // WebSocket closed, will use polling
        }
      } catch (err) {
        // WebSocket connection failed, continue without it (polling fallback)
        console.warn('WebSocket not available, using polling for updates')
      }
    } else {
      // Poll for updates every 5 seconds if WebSocket not available
      const pollInterval = setInterval(() => {
        load()
      }, 5000)
      return () => clearInterval(pollInterval)
    }
    
    return () => {
      if (ws) ws.close()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-lg">Loading markets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <div className="text-red-400 text-2xl mb-2">⚠️</div>
          <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (markets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Welcome to OracleX
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            Decentralized prediction markets powered by AI on Polygon Amoy
          </p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-semibold mb-2">No Markets Available</h2>
          <p className="text-gray-400 mb-4">
            Markets will appear here once they are created. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Active Markets
        </h1>
        <p className="text-gray-400 text-lg">
          {markets.length} {markets.length === 1 ? 'market' : 'markets'} available
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map(m => (
          <Link 
            key={m.marketId} 
            to={`/market/${m.marketId}`} 
            className="group block bg-gradient-to-br from-gray-800/80 to-gray-900/80 hover:from-gray-700/80 hover:to-gray-800/80 border border-gray-700/50 hover:border-blue-500/50 rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                {m.eventId || `Market #${m.marketId}`}
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                m.vault 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {m.vault ? 'Deployed' : 'Pending'}
              </div>
            </div>
            
            <h3 className="font-bold text-lg mb-4 text-white group-hover:text-blue-300 transition-colors line-clamp-2">
              {m.description || 'No description available'}
            </h3>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <div>
                <div className="text-xs text-gray-400 mb-1">AI Probability</div>
                <div className="text-xl font-bold text-blue-400">
                  {m.probability !== null && m.probability !== undefined ? `${m.probability}%` : '—'}
                </div>
              </div>
              <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
