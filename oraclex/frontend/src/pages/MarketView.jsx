import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useAccount, usePublicClient, useWriteContract, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'

const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function MarketView() {
  const { id } = useParams()
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [usdcAbi, setUsdcAbi] = useState(null)
  const [vaultAbi, setVaultAbi] = useState(null)
  const [addresses, setAddresses] = useState(null)
  const [aiCommit, setAiCommit] = useState('')

  const [amount, setAmount] = useState('100')
  const [side, setSide] = useState(1) // 1 YES, 0 NO

  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(`${backend}/markets`)
      const m = res.data.find(x => x.marketId === id)
      setMarket(m)
    }
    load()
  }, [id])

  useEffect(() => {
    const bootstrap = async () => {
      const addrRes = await axios.get(`${backend}/addresses`)
      setAddresses(addrRes.data)
      const usdc = await axios.get(`${backend}/abi/USDC`).catch(() => ({ data: { abi: [] }}))
      const vault = await axios.get(`${backend}/abi/OracleXVault`).catch(() => ({ data: { abi: [] }}))
      setUsdcAbi(usdc.data.abi)
      setVaultAbi(vault.data.abi)
      try {
        const commit = await axios.get(`${backend}/get-commitment/${id}`)
        setAiCommit(commit.data.aiHash)
      } catch (_) {}
    }
    bootstrap()
  }, [id])

  const totalYes = useReadContract({
    address: market?.vault,
    abi: vaultAbi || [],
    functionName: 'totalYes',
    query: { enabled: Boolean(market?.vault && vaultAbi) }
  })
  const totalNo = useReadContract({
    address: market?.vault,
    abi: vaultAbi || [],
    functionName: 'totalNo',
    query: { enabled: Boolean(market?.vault && vaultAbi) }
  })
  const vaultState = useReadContract({
    address: market?.vault,
    abi: vaultAbi || [],
    functionName: 'state',
    query: { enabled: Boolean(market?.vault && vaultAbi) }
  })
  const winningSide = useReadContract({
    address: market?.vault,
    abi: vaultAbi || [],
    functionName: 'winningSide',
    query: { enabled: Boolean(market?.vault && vaultAbi && vaultState?.data !== undefined && Number(vaultState.data) === 2) }
  })

  const [error, setError] = useState(null)
  
  // Check if vault is settled (state === 2)
  const isSettled = vaultState?.data !== undefined && Number(vaultState.data) === 2

  const runAI = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!market) {
        throw new Error('Market data not loaded')
      }
      // Use market.marketId if available, otherwise fall back to URL id
      const marketIdToUse = market.marketId || id
      if (!marketIdToUse) {
        throw new Error('Market ID not found')
      }
      const res = await axios.post(`${backend}/ai-run`, {
        marketId: marketIdToUse,
        eventId: market.eventId,
        description: market.description,
        closeTimestamp: market.closeTimestamp
      })
      setMarket({ ...market, probability: res.data.probability })
      setAiCommit(res.data.aiHash)
      // Reload market data
      const marketRes = await axios.get(`${backend}/markets`)
      const updatedMarket = marketRes.data.find(x => 
        x.marketId === marketIdToUse || x.marketId === id
      )
      if (updatedMarket) setMarket(updatedMarket)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to run AI'
      setError(errorMsg)
      console.error('AI Run Error:', err)
      console.error('Error details:', err.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const allocate = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!market?.vault) {
        throw new Error('Market vault not deployed')
      }
      // Use market.marketId if available, otherwise fall back to URL id
      const marketIdToUse = market.marketId || id
      if (!marketIdToUse) {
        throw new Error('Market ID not found')
      }
      const res = await axios.post(`${backend}/allocate`, { marketId: marketIdToUse })
      console.log('Allocation successful:', res.data)
      // Reload market data
      const marketRes = await axios.get(`${backend}/markets`)
      const updatedMarket = marketRes.data.find(x => 
        x.marketId === marketIdToUse || x.marketId === id
      )
      if (updatedMarket) setMarket(updatedMarket)
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to allocate liquidity'
      setError(errorMsg)
      console.error('Allocate Error:', err)
      console.error('Error details:', err.response?.data)
    } finally {
      setLoading(false)
    }
  }

  // Market settlement is handled by Chainlink Functions automatically when market closes
  // This function is kept for manual testing/emergency settlement if needed
  const settleMarket = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!market?.vault) {
        throw new Error('Market vault not deployed')
      }
      // Use market.marketId if available, otherwise fall back to URL id
      const marketIdToUse = market.marketId || id
      if (!marketIdToUse) {
        throw new Error('Market ID not found')
      }
      const winningSide = market?.probability != null && market.probability >= 50 ? 1 : 0
      const res = await axios.post(`${backend}/settle-market`, { 
        marketId: marketIdToUse, 
        winningSide 
      })
      console.log('Market settled:', res.data)
      // Reload market data
      const marketRes = await axios.get(`${backend}/markets`)
      const updatedMarket = marketRes.data.find(x => 
        x.marketId === marketIdToUse || x.marketId === id
      )
      if (updatedMarket) setMarket(updatedMarket)
    } catch (err) {
      let errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to settle market'
      
      // If already settled, show a friendlier message
      if (err.response?.data?.alreadySettled) {
        const winningSideText = err.response?.data?.winningSide !== undefined 
          ? (err.response.data.winningSide === 0 ? 'NO' : 'YES')
          : 'unknown'
        errorMsg = `Market is already settled. Winning side: ${winningSideText}`
      }
      
      setError(errorMsg)
      console.error('Settle Market Error:', err)
      console.error('Error details:', err.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const deposit = async () => {
    if (!address || !market?.vault || !usdcAbi || !vaultAbi) return
    setLoading(true)
    try {
      const amt = parseUnits(amount || '0', 6)
      // approve
      await writeContractAsync({
        address: addresses?.USDC,
        abi: usdcAbi,
        functionName: 'approve',
        args: [market.vault, amt]
      })
      // deposit
      await writeContractAsync({
        address: market.vault,
        abi: vaultAbi,
        functionName: 'deposit',
        args: [Number(side), amt]
      })
    } finally {
      setLoading(false)
    }
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-lg">Loading market...</p>
      </div>
    )
  }

  const yesTVL = totalYes?.data ? Number(totalYes.data) / 1e6 : 0
  const noTVL = totalNo?.data ? Number(totalNo.data) / 1e6 : 0
  const totalTVL = yesTVL + noTVL
  const yesPercent = totalTVL > 0 ? (yesTVL / totalTVL * 100).toFixed(1) : 50

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl p-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="text-xs font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded inline-block mb-2">
              {market.eventId || `Market #${id}`}
            </div>
            <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {market.description || 'No description available'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                <span>AI Probability: <span className="text-blue-400 font-semibold">{market.probability ?? '—'}%</span></span>
              </div>
              {market.vault && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-green-400">Vault Deployed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-700/50">
          <button 
            onClick={runAI} 
            disabled={loading} 
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Processing...' : '🤖 Run AI'}
          </button>
          <button 
            onClick={allocate} 
            disabled={loading || !market.vault} 
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            Allocate
          </button>
          <button 
            onClick={settleMarket} 
            disabled={loading || !market.vault || isSettled} 
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            title={isSettled ? `Market already settled. Winning side: ${winningSide?.data === 0 ? 'NO' : 'YES'}` : 'Manually settle market (normally handled by Chainlink Functions)'}
          >
            {isSettled ? 'Already Settled' : 'Settle Market'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-red-400 text-xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                <p className="text-red-300 text-sm">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposit Section */}
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>💰</span> Make a Deposit
          </h2>
          
          {!address && (
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
              <p className="text-yellow-400 text-sm">⚠️ Please connect your wallet to make deposits</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Choose Your Side</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSide(1)}
                  className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                    side === 1
                      ? 'bg-green-500/20 border-green-500 text-green-400 shadow-lg'
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">✅</div>
                  <div>YES</div>
                </button>
                <button
                  onClick={() => setSide(0)}
                  className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                    side === 0
                      ? 'bg-red-500/20 border-red-500 text-red-400 shadow-lg'
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">❌</div>
                  <div>NO</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USDC)</label>
              <div className="flex gap-2">
                <input 
                  value={amount} 
                  onChange={(e)=>setAmount(e.target.value)} 
                  placeholder="Enter amount" 
                  type="number"
                  className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button 
                  onClick={deposit} 
                  disabled={loading || !address || !market.vault} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Processing...' : 'Deposit'}
                </button>
              </div>
            </div>

            {address && (
              <div className="pt-4 border-t border-gray-700/50">
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 mb-3">
                  <p className="text-blue-400 text-sm text-center">
                    💡 Get USDC from Polygon Amoy faucet or bridge
                  </p>
                  <a 
                    href="https://faucet.polygon.technology/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-center mt-2 text-blue-300 hover:text-blue-200 underline text-xs"
                  >
                    Open Polygon Faucet →
                  </a>
                </div>
                <p className="text-xs text-gray-500 text-center">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Vault Stats Section */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📊</span> Vault Statistics
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>YES Pool</span>
                <span className="font-semibold text-green-400">{yesTVL.toFixed(2)} USDC</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500"
                  style={{ width: `${yesPercent}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>NO Pool</span>
                <span className="font-semibold text-red-400">{noTVL.toFixed(2)} USDC</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-600 h-full transition-all duration-500"
                  style={{ width: `${100 - yesPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700/50">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total TVL</span>
                <span className="text-2xl font-bold text-blue-400">{totalTVL.toFixed(2)} USDC</span>
              </div>
            </div>

            {isSettled && (
              <div className="pt-4 border-t border-gray-700/50">
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400">✓</span>
                    <span className="text-green-400 font-semibold">Market Settled</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Winning Side: <span className={`font-bold ${winningSide?.data === 1 ? 'text-green-400' : 'text-red-400'}`}>
                      {winningSide?.data === 1 ? 'YES ✅' : 'NO ❌'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {market.vault && (
              <div className="pt-4 border-t border-gray-700/50">
                <div className="text-xs text-gray-500 mb-1">Vault Address</div>
                <div className="font-mono text-xs break-all text-gray-400 bg-gray-900/50 p-2 rounded">
                  {market.vault}
                </div>
              </div>
            )}

            {aiCommit && (
              <div className="pt-4 border-t border-gray-700/50">
                <div className="text-xs text-gray-500 mb-1">AI Commitment Hash</div>
                <div className="font-mono text-xs break-all text-gray-400 bg-gray-900/50 p-2 rounded">
                  {aiCommit}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
