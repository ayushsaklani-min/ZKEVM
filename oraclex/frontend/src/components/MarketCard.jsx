import React from 'react'

export default function MarketCard({ m }) {
  return (
    <div className="p-4 rounded bg-white/5">
      <div className="text-sm text-white/60">{m.eventId}</div>
      <div className="font-semibold">{m.description}</div>
      <div className="text-sm mt-2">AI prob: {m.probability ?? '—'}%</div>
    </div>
  )
}
