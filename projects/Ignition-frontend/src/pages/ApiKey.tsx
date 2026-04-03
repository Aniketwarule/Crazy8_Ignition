import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Key, Copy, Check, RefreshCw, Shield, AlertCircle, Terminal, ChevronDown } from 'lucide-react'
import { usePeraWallet } from '../hooks/usePeraWallet'
import { ellipseAddress } from '../utils/ellipseAddress'
import { BASE_MODELS } from '../types/models'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'

export default function ApiKey() {
  const { address, isConnected, connect, isConnecting } = usePeraWallet()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string>(BASE_MODELS[0].id)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hits, setHits] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  // Poll stats when we have a key
  useEffect(() => {
    if (!apiKey) return

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/apikeys/stats?key=${encodeURIComponent(apiKey)}`)
        if (res.ok) {
          const data = await res.json()
          setHits(data.hits)
        }
      } catch {
        // Silently fail on poll — backend may be down
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000) // refresh every 5s
    return () => clearInterval(interval)
  }, [apiKey])

  const generateKey = useCallback(async () => {
    if (!address || !selectedModelId) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/apikeys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, modelId: selectedModelId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate API key')
      }

      const data = await res.json()
      setApiKey(data.apiKey)
      setHits(data.hits)
    } catch (err: any) {
      console.error('[ApiKey] Generation failed:', err)
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setIsGenerating(false)
    }
  }, [address, selectedModelId])

  const copyToClipboard = useCallback(() => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [apiKey])

  const selectedModel = BASE_MODELS.find(m => m.id === selectedModelId)

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <div className="scan-line-overlay" />

      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-700/60 bg-[#0A0A0A]/95 backdrop-blur-sm z-50">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-terminal-green transition-colors text-xs font-mono uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Playground
          </Link>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-terminal-green" strokeWidth={2.5} />
            <h1 className="font-sans font-bold text-sm tracking-[0.15em] text-white uppercase">
              API Access
            </h1>
          </div>
        </div>

        {isConnected && address && (
          <div className="flex items-center gap-2 px-3 py-1.5 border border-terminal-green/20 bg-terminal-green/5">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
            <span className="text-xs font-mono text-terminal-green">
              {ellipseAddress(address, 4)}
            </span>
          </div>
        )}
      </header>

      {/* ─── Body ─── */}
      <div className="flex-1 overflow-y-auto">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="max-w-lg w-full border border-gray-700 p-8 bg-[#0d0d0d]">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-red-400" />
                <span className="font-mono text-sm text-red-400 font-bold uppercase tracking-wider">
                  Authentication Required
                </span>
              </div>
              <div className="font-mono text-sm space-y-2 mb-8">
                <p className="text-gray-400">
                  <span className="text-red-400">{'>'}</span> ERROR: UNAUTHORIZED_ACCESS
                </p>
                <p className="text-gray-500">
                  <span className="text-gray-600">{'>'}</span> Please connect your wallet to generate API credentials.
                </p>
              </div>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:border-terminal-green disabled:opacity-50 transition-all duration-150 font-mono text-sm uppercase tracking-wider"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto p-6 mt-8 space-y-8">
            {/* Intro Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-700/40">
                <Key className="w-5 h-5 text-terminal-green" />
                <div>
                  <h2 className="font-sans font-bold text-lg text-white">Developer API</h2>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    Integrate Ignition AI models directly into your applications
                  </p>
                </div>
              </div>
              
              <div className="bg-terminal-green/5 border border-terminal-green/20 p-4 font-mono text-xs text-gray-400 leading-relaxed">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-terminal-green flex-shrink-0 mt-0.5" />
                  <p className="text-white font-bold uppercase tracking-wider">Security Notice</p>
                </div>
                Your API key is a sensitive credential. Never share it or commit it to version control. 
                It grants access to models using your wallet's authorized balances.
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="border border-red-500/30 bg-red-500/5 p-4 font-mono text-xs text-red-400 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider mb-1">Connection Error</p>
                  <p className="text-red-400/80">{error}</p>
                  <p className="text-gray-600 mt-1">Make sure the backend is running on {API_BASE}</p>
                </div>
              </div>
            )}

            {/* Model Selection Dropdown */}
            <div className="space-y-3">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold">
                Select Model Scope
              </label>
              <div className="relative group">
                <select
                  value={selectedModelId}
                  onChange={(e) => {
                    setSelectedModelId(e.target.value)
                    setApiKey(null)
                    setHits(0)
                    setError(null)
                  }}
                  className="w-full bg-[#0d0d0d] border border-gray-700 p-3 pr-10 font-mono text-sm text-white outline-none appearance-none focus:border-terminal-green transition-all"
                >
                  {BASE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} — {model.cost} ALGO/req
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-focus-within:text-terminal-green transition-colors" />
              </div>
              <p className="text-[10px] font-mono text-gray-600 uppercase">
                The generated key will be constrained to the selected model only.
              </p>
            </div>

            {/* Key Generation Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold inline-flex items-center gap-2">
                  <span>Your API Key</span>
                  {apiKey && (
                    <span className="px-1.5 py-0.5 bg-terminal-green/10 text-terminal-green border border-terminal-green/30 text-[9px]">
                      {selectedModel?.name.toUpperCase()}
                    </span>
                  )}
                </h3>
                {apiKey && (
                  <button 
                    onClick={() => { setApiKey(null); setHits(0); generateKey(); }}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 hover:text-terminal-yellow transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    REVOKE & REGENERATE
                  </button>
                )}
              </div>

              {!apiKey ? (
                <div className="border border-dashed border-gray-700 p-12 flex flex-col items-center justify-center bg-[#0d0d0d]/50 group">
                  <button
                    onClick={generateKey}
                    disabled={isGenerating}
                    className="flex flex-col items-center gap-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-16 h-16 rounded-full border border-terminal-green/20 flex items-center justify-center bg-terminal-green/5 group-hover:border-terminal-green/50 group-hover:shadow-[0_0_20px_rgba(0,255,163,0.1)] transition-all">
                      {isGenerating ? (
                        <RefreshCw className="w-8 h-8 text-terminal-green animate-spin" />
                      ) : (
                        <Key className="w-8 h-8 text-terminal-green" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-sm text-terminal-green font-bold uppercase tracking-widest">
                        {isGenerating ? 'Generating...' : 'Generate New API Key'}
                      </p>
                      <p className="text-[10px] font-mono text-gray-600 mt-1 uppercase">
                        Requires No Transaction Fee
                      </p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="border border-gray-700 bg-[#0d0d0d] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/50 bg-[#141414]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <Terminal className="w-3 h-3 text-gray-500 ml-2" />
                    <span className="text-[11px] font-mono text-gray-500">credentials.env</span>
                  </div>
                  
                  <div className="p-4 flex items-center justify-between gap-4 font-mono">
                    <code className="text-terminal-green text-sm break-all">
                      IGNITION_API_KEY={apiKey}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className={`flex-shrink-0 p-2 border transition-all ${
                        copied 
                          ? 'border-terminal-green text-terminal-green bg-terminal-green/10' 
                          : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Usage Stats Panel ─── */}
            {apiKey && (
              <div className="border border-gray-700 bg-[#0d0d0d] p-5 space-y-4 animate-fade-in">
                <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold">
                  Usage Monitor
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-gray-700/50 p-4 text-center">
                    <p className="text-3xl font-mono font-bold text-terminal-green">{hits}</p>
                    <p className="text-[10px] font-mono text-gray-500 uppercase mt-1">Total Hits</p>
                  </div>
                  <div className="border border-gray-700/50 p-4 text-center">
                    <p className="text-3xl font-mono font-bold text-terminal-yellow">
                      {(hits * (selectedModel?.cost || 0)).toFixed(2)}
                    </p>
                    <p className="text-[10px] font-mono text-gray-500 uppercase mt-1">ALGO Accrued</p>
                  </div>
                  <div className="border border-gray-700/50 p-4 text-center">
                    <p className="text-3xl font-mono font-bold text-purple-400">
                      {selectedModel?.cost || 0}
                    </p>
                    <p className="text-[10px] font-mono text-gray-500 uppercase mt-1">ALGO / Request</p>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-600 text-center">
                  Stats refresh automatically every 5 seconds
                </p>
              </div>
            )}

            {/* Quick Start */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold">Quick Start</h3>
              <div className="border border-gray-700 bg-[#0d0d0d] p-4 font-mono text-xs space-y-3">
                <div className="text-gray-500 flex items-center gap-2">
                  <span className="text-terminal-green">#</span> Example request using cURL
                </div>
                <div className="bg-black/50 p-3 text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
{`curl -X POST ${API_BASE}/api/apikeys/hit \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Hello via API"
  }'`}
                </div>
                <div className="text-gray-500 flex items-center gap-2 pt-2 border-t border-gray-700/30">
                  <span className="text-terminal-green">#</span> Check your usage stats
                </div>
                <div className="bg-black/50 p-3 text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
{`curl ${API_BASE}/api/apikeys/stats?key=YOUR_API_KEY`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
