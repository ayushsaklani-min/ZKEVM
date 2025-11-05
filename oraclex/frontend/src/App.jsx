import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Outlet, Link } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <Link to="/" className="font-bold text-xl">OracleX</Link>
        <ConnectButton />
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
