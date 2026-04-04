import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Zap, LogOut, Wallet, Loader2, Sun, Moon, Menu, X } from 'lucide-react'
import { usePeraWallet } from '../../hooks/usePeraWallet'
import { useTheme } from '../../contexts/ThemeProvider'
import { ellipseAddress } from '../../utils/ellipseAddress'

export default function Header() {
  const { address, balance, isConnected, isConnecting, connect, disconnect } = usePeraWallet()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { to: '/home', label: 'Playground' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/publish', label: 'Publish' },
    { to: '/api-key', label: 'API Keys' },
  ]

  return (
    <nav className="navbar-float backdrop-blur-lg">
      <Link to="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] dark:bg-white flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white dark:text-[#1a1a1a]" strokeWidth={2.5} />
        </div>
        <span className="font-sans font-bold text-sm tracking-wide text-[#1a1a1a] dark:text-white hidden sm:inline">
          Ignition
        </span>
      </Link>

      {/* ─── Desktop Nav Links ─── */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-black text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-[#1a1a1a] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      {/* ─── Right: Wallet + Theme + Mobile Toggle ─── */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-400 hover:text-[#1a1a1a] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Wallet */}
        {isConnected && address ? (
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span className="text-xs font-medium text-content dark:text-content-dark">
                {balance.toFixed(2)} ALGO
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {ellipseAddress(address, 4)}
              </span>
            </div>
            <button
              onClick={disconnect}
              className="p-2 rounded-lg text-gray-400 hover:text-accent-red hover:bg-accent-red/5 transition-all"
              title="Disconnect wallet"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="btn-primary flex items-center gap-2 !py-2 !px-4 !text-xs"
          >
            {isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wallet className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect'}</span>
          </button>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── Mobile dropdown ─── */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 rounded-2xl bg-white/90 dark:bg-[#1e1e1e]/95 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.05] md:hidden animate-fade-in" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#1a1a1a]/[0.07] dark:bg-white/[0.1] text-[#1a1a1a] dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {/* Mobile wallet info */}
            {isConnected && address && (
              <div className="flex items-center justify-between px-4 py-2.5 mt-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                  <span className="text-xs font-medium text-accent-green">
                    {balance.toFixed(2)} ALGO
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="text-xs text-gray-400 hover:text-accent-red transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
