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
      const usdc = await axios.get(`${backend}/abi/MockUSDC`).catch(() => ({ data: { abi: [] }}))
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

  const runAI = async () => {
    setLoading(true)
    try {
      const res = await axios.post(`${backend}/ai-run`, market)
      setMarket({ ...market, probability: res.data.probability })
      setAiCommit(res.data.aiHash)
    } finally {
      setLoading(false)
    }
  }

  const allocate = async () => {
    setLoading(true)
    try {
      await axios.post(`${backend}/allocate`, { marketId: id })
    } finally {
      setLoading(false)
    }
  }

  const simulateOutcome = async () => {
    setLoading(true)
    try {
      await axios.post(`${backend}/simulate-outcome`, { marketId: id, winningSide: market?.probability >= 50 ? 1 : 0 })
    } finally {
      setLoading(false)
    }
  }

  const faucet = async () => {
    if (!address) return
    setLoading(true)
    try {
      await axios.post(`${backend}/faucet`, { to: address, amount: String(1_000n * 10n ** 6n) })
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
        address: addresses?.MockUSDC,
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

  if (!market) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <div className="text-sm text-white/60">{market.eventId}</div>
      <div className="text-2xl font-bold">{market.description}</div>
      <div className="text-sm">AI prob: {market.probability ?? '—'}%</div>
      <div className="text-sm break-all">aiHash: {aiCommit || '—'}</div>
      <div className="text-sm">Vault: {market.vault ?? '—'}</div>

      <div className="flex gap-2">
        <button onClick={runAI} disabled={loading} className="px-3 py-2 bg-white/10 rounded hover:bg-white/20">Run AI</button>
        <button onClick={allocate} disabled={loading} className="px-3 py-2 bg-white/10 rounded hover:bg-white/20">Allocate</button>
        <button onClick={simulateOutcome} disabled={loading} className="px-3 py-2 bg-white/10 rounded hover:bg-white/20">Simulate Outcome</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded bg-white/5">
          <div className="font-semibold mb-2">Deposit</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm">Side</label>
            <select value={side} onChange={(e) => setSide(Number(e.target.value))} className="bg-black border border-white/10 rounded px-2 py-1">
              <option value={1}>YES</option>
              <option value={0}>NO</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Amount USDC" className="flex-1 bg-black border border-white/10 rounded px-3 py-2" />
            <button onClick={deposit} disabled={loading || !address || !market.vault} className="px-3 py-2 bg-white/10 rounded hover:bg-white/20">Deposit</button>
          </div>
          <div className="text-xs text-white/50 mt-2">Connected: {address || '—'}</div>
          <button onClick={faucet} disabled={loading || !address} className="mt-2 px-3 py-2 bg-white/10 rounded hover:bg-white/20">Get 1,000 mUSDC Faucet</button>
        </div>
        <div className="p-4 rounded bg-white/5">
          <div className="font-semibold mb-2">Vault Stats</div>
          <div className="text-sm">YES TVL: {totalYes?.data ? Number(totalYes.data) / 1e6 : '—'} USDC</div>
          <div className="text-sm">NO TVL: {totalNo?.data ? Number(totalNo.data) / 1e6 : '—'} USDC</div>
        </div>
      </div>
    </div>
  )
}
