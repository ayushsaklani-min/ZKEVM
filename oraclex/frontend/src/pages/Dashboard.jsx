import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export default function Dashboard() {
  const [markets, setMarkets] = useState([])

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(`${backend}/markets`)
      setMarkets(res.data)
    }
    load()
    const ws = new WebSocket((import.meta.env.VITE_WS_URL || 'ws://localhost:4001'))
    ws.onmessage = (msg) => {
      try { const d = JSON.parse(msg.data); if (d.type && d.type.includes('market')) load(); } catch (_) {}
    }
    return () => ws.close()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {markets.map(m => (
        <Link key={m.marketId} to={`/market/${m.marketId}`} className="p-4 rounded bg-white/5 hover:bg-white/10 transition">
          <div className="text-sm text-white/60">{m.eventId}</div>
          <div className="font-semibold">{m.description}</div>
          <div className="text-sm mt-2">AI prob: {m.probability ?? '—'}%</div>
          <div className="text-xs text-white/50 mt-1">Status: {m.vault ? 'Deployed' : 'Pending'}</div>
        </Link>
      ))}
    </div>
  )
}
