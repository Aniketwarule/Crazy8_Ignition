import { Link } from 'react-router-dom'
import { Zap, Radio, LogOut, Wallet, Loader2, Rocket } from 'lucide-react'
import { usePeraWallet } from '../../hooks/usePeraWallet'
import { ellipseAddress } from '../../utils/ellipseAddress'

export default function Header() {
  const { address, balance, isConnected, isConnecting, connect, disconnect } = usePeraWallet()

  const network = import.meta.env.VITE_ALGOD_NETWORK || 'localnet'

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-gray-700/60 bg-terminal-bg/95 backdrop-blur-sm z-50">
      {/* ─── Left: Brand + Nav ─── */}
      <div className="flex items-center gap-3">
        <Zap className="w-4 h-4 text-terminal-green" strokeWidth={2.5} />
        <h1 className="font-sans font-bold text-base tracking-[0.2em] text-white uppercase">
          IGNITION
        </h1>
        <span className="text-gray-700 hidden sm:inline">|</span>
        <span className="text-gray-500 text-xs font-mono hidden sm:inline">
          /playground
        </span>
        <Link
          to="/publish"
          className="hidden sm:flex items-center gap-1 text-gray-500 hover:text-purple-400 text-xs font-mono transition-colors"
        >
          <Rocket className="w-3 h-3" />
          /publish
        </Link>
      </div>

      {/* ─── Center: Network badge ─── */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 border border-gray-700/50">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terminal-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-terminal-green" />
        </span>
        <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
          {network}
        </span>
      </div>

      {/* ─── Right: Wallet ─── */}
      <div className="flex items-center gap-2">
        {isConnected && address ? (
          <>
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-gray-700/50 text-xs font-mono text-gray-400">
              <span className="text-terminal-green font-bold">{balance.toFixed(2)}</span>
              <span className="text-gray-500">ALGO</span>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-terminal-green/20 bg-terminal-green/5">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              <span className="text-xs font-mono text-terminal-green">
                {ellipseAddress(address, 4)}
              </span>
            </div>

            {/* Disconnect */}
            <button
              onClick={disconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/5 transition-all duration-150 text-xs font-mono uppercase tracking-wider"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          </>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-1.5 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:border-terminal-green disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 text-xs font-mono uppercase tracking-wider group"
          >
            {isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wallet className="w-3.5 h-3.5 group-hover:animate-pulse" />
            )}
            <span>{isConnecting ? 'CONNECTING...' : 'CONNECT PERA'}</span>
            <Radio className="w-3 h-3 opacity-50" />
          </button>
        )}
      </div>
    </header>
  )
}
