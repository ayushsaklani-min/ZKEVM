import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAccount, useSignMessage } from 'wagmi'
import { formatEther } from 'viem'

const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [estimatingGas, setEstimatingGas] = useState(false)
  const [gasEstimate, setGasEstimate] = useState(null)
  const [formData, setFormData] = useState({
    eventId: '',
    description: '',
    closeTimestamp: ''
  })
  const [pendingMarket, setPendingMarket] = useState(null)

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

  const validateForm = () => {
    const errors = []
    
    // Event ID validation
    const eventId = formData.eventId.trim()
    if (eventId.length === 0) {
      errors.push('Event ID is required')
    } else if (eventId.length > 100) {
      errors.push('Event ID must be 100 characters or less')
    } else if (!/^[a-zA-Z0-9\-_ ]+$/.test(eventId)) {
      errors.push('Event ID can only contain letters, numbers, spaces, hyphens, and underscores')
    }
    
    // Description validation
    const description = formData.description.trim()
    if (description.length === 0) {
      errors.push('Description is required')
    } else if (description.length > 500) {
      errors.push('Description must be 500 characters or less')
    }
    
    // Close timestamp validation
    const now = Math.floor(Date.now() / 1000)
    const closeTs = formData.closeTimestamp 
      ? Math.floor(new Date(formData.closeTimestamp).getTime() / 1000)
      : now + 86400 // 24 hours
    
    if (closeTs < now) {
      errors.push('Close date cannot be in the past')
    } else if (closeTs > now + (365 * 24 * 60 * 60)) {
      errors.push('Close date cannot be more than 1 year in the future')
    }
    
    return errors
  }

  const estimateGas = async (eventId, description, closeTs) => {
    try {
      setEstimatingGas(true)
      const res = await axios.post(`${backend}/estimate-gas`, {
        eventId,
        description,
        closeTimestamp: closeTs
      })
      setGasEstimate(res.data)
      return res.data
    } catch (err) {
      console.error('Failed to estimate gas:', err)
      return null
    } finally {
      setEstimatingGas(false)
    }
  }

  const handleCreateMarket = async (e) => {
    e.preventDefault()
    setError(null)
    
    // Check wallet connection
    if (!isConnected || !address) {
      setError('Please connect your wallet to create a market')
      return
    }
    
    // Client-side validation
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '))
      return
    }
    
    // Calculate close timestamp
    const closeTs = formData.closeTimestamp 
      ? Math.floor(new Date(formData.closeTimestamp).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + 86400 // 24 hours
    
    // Sanitize inputs
    const eventId = formData.eventId.trim().substring(0, 100)
    const description = formData.description.trim().substring(0, 500)
    
    // Estimate gas first
    const gas = await estimateGas(eventId, description, closeTs)
    if (!gas) {
      setError('Failed to estimate gas costs. Please try again.')
      return
    }
    
    // Store pending market data and show confirmation
    setPendingMarket({ eventId, description, closeTimestamp: closeTs, gasEstimate: gas })
    setShowCreateModal(false)
    setShowConfirmModal(true)
  }

  const confirmCreateMarket = async () => {
    if (!pendingMarket || !isConnected || !address) {
      setError('Missing required information')
      return
    }
    
    setCreating(true)
    setError(null)
    
    try {
      // Sign message for authentication
      const message = `Create OracleX Market\n\nEvent ID: ${pendingMarket.eventId}\nDescription: ${pendingMarket.description}\nClose: ${new Date(pendingMarket.closeTimestamp * 1000).toISOString()}\n\nTimestamp: ${Date.now()}`
      let signature = null
      try {
        signature = await signMessageAsync({ message })
      } catch (sigError) {
        if (sigError.message?.includes('rejected') || sigError.message?.includes('denied')) {
          setError('Signature rejected. Please sign the message to create the market.')
          setCreating(false)
          return
        }
        throw sigError
      }
      
      // Create market with signature
      const createRes = await axios.post(`${backend}/create-market`, {
        eventId: pendingMarket.eventId,
        description: pendingMarket.description,
        closeTimestamp: pendingMarket.closeTimestamp,
        creatorAddress: address,
        signature,
        message
      })
      
      const { marketId } = createRes.data
      console.log('Market created:', marketId)
      
      // Deploy market on-chain
      const deployRes = await axios.post(`${backend}/deploy-market`, {
        marketId: marketId,
        eventId: pendingMarket.eventId,
        description: pendingMarket.description,
        closeTimestamp: pendingMarket.closeTimestamp
      })
      
      console.log('Market deployed:', deployRes.data)
      
      // Reset form and close modals
      setFormData({ eventId: '', description: '', closeTimestamp: '' })
      setShowConfirmModal(false)
      setPendingMarket(null)
      setGasEstimate(null)
      
      // Reload markets
      const marketsRes = await axios.get(`${backend}/markets`)
      setMarkets(marketsRes.data || [])
    } catch (err) {
      console.error('Failed to create market:', err)
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create market'
      setError(errorMsg)
      
      // If rate limited, show helpful message
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a few minutes before creating another market.')
      }
    } finally {
      setCreating(false)
    }
  }

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
            Create your first prediction market to get started!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            ➕ Create Market
          </button>
        </div>
        
        {/* Create Market Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Create New Market</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreateMarket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event ID <span className="text-gray-500 text-xs">(max 100 chars, alphanumeric only)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    placeholder="e.g., ETH-4000-2025"
                    required
                    maxLength={100}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.eventId.length}/100 characters
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description <span className="text-gray-500 text-xs">(max 500 chars)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Will ETH reach $4000 by end of 2025?"
                    required
                    maxLength={500}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 characters
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Close Date & Time (optional - defaults to 24h from now)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.closeTimestamp}
                    onChange={(e) => setFormData({ ...formData, closeTimestamp: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {error && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || estimatingGas || !isConnected}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {estimatingGas ? 'Estimating...' : creating ? 'Creating...' : !isConnected ? 'Connect Wallet' : 'Create Market'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Active Markets
          </h1>
          <p className="text-gray-400 text-lg">
            {markets.length} {markets.length === 1 ? 'market' : 'markets'} available
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          ➕ Create Market
        </button>
      </div>
      
      {/* Create Market Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Create New Market</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setError(null)
                  setFormData({ eventId: '', description: '', closeTimestamp: '' })
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateMarket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event ID <span className="text-gray-500 text-xs">(max 100 chars, alphanumeric only)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.eventId}
                    onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                    placeholder="e.g., ETH-4000-2025"
                    required
                    maxLength={100}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.eventId.length}/100 characters
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description <span className="text-gray-500 text-xs">(max 500 chars)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Will ETH reach $4000 by end of 2025?"
                    required
                    maxLength={500}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 characters
                  </div>
                </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Close Date & Time (optional - defaults to 24h from now)
                </label>
                <input
                  type="datetime-local"
                  value={formData.closeTimestamp}
                  onChange={(e) => setFormData({ ...formData, closeTimestamp: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError(null)
                    setFormData({ eventId: '', description: '', closeTimestamp: '' })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || estimatingGas || !isConnected}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {estimatingGas ? 'Estimating...' : creating ? 'Creating...' : !isConnected ? 'Connect Wallet' : 'Create Market'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmModal && pendingMarket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Confirm Market Creation</h2>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingMarket(null)
                  setGasEstimate(null)
                  setError(null)
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Event ID</div>
                  <div className="text-white font-medium">{pendingMarket.eventId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Description</div>
                  <div className="text-white">{pendingMarket.description}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Close Date</div>
                  <div className="text-white">
                    {new Date(pendingMarket.closeTimestamp * 1000).toLocaleString()}
                  </div>
                </div>
                {pendingMarket.gasEstimate && (
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="text-xs text-gray-400 mb-1">Estimated Gas Cost</div>
                    <div className="text-green-400 font-semibold">
                      ~{parseFloat(pendingMarket.gasEstimate.estimatedCostEth).toFixed(6)} MATIC
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Gas: {parseInt(pendingMarket.gasEstimate.gasEstimate).toLocaleString()} units
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  ⚠️ You will need to sign a message to authenticate. The backend will deploy the market contract on your behalf.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmModal(false)
                    setPendingMarket(null)
                    setGasEstimate(null)
                    setError(null)
                    setShowCreateModal(true)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={confirmCreateMarket}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating & Deploying...' : 'Confirm & Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
