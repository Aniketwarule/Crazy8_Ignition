import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowLeft, Key, Copy, Check, RefreshCw, Shield, AlertCircle, Terminal, ChevronDown } from 'lucide-react'
import { usePeraWallet } from '../hooks/usePeraWallet'
import { ellipseAddress } from '../utils/ellipseAddress'
import { BASE_MODELS } from '../types/models'

export default function ApiKey() {
  const { address, isConnected, connect, isConnecting } = usePeraWallet()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string>(BASE_MODELS[0].id)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateKey = useCallback(async () => {
    if (!address || !selectedModelId) return
    setIsGenerating(true)
    
    // Simulate API call to generate key
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Include model ID in the key for demonstration
    const newKey = `ign_${selectedModelId.substring(0, 4)}_${randomBytes}`
    
    setApiKey(newKey)
    setIsGenerating(false)
  }, [address, selectedModelId])

  const copyToClipboard = useCallback(() => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [apiKey])

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Scan-line overlay */}
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
                    setApiKey(null) // Clear existing key when model changes
                  }}
                  className="w-full bg-[#0d0d0d] border border-gray-700 p-3 pr-10 font-mono text-sm text-white outline-none appearance-none focus:border-terminal-green transition-all"
                >
                  {BASE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} — {model.category.toUpperCase()} — {model.cost} ALGO
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
                      {BASE_MODELS.find(m => m.id === selectedModelId)?.name.toUpperCase()}
                    </span>
                  )}
                </h3>
                {apiKey && (
                  <button 
                    onClick={() => { setApiKey(null); generateKey(); }}
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

            {/* Quick Start Sidebar/Bottom */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold">Quick Start</h3>
              <div className="border border-gray-700 bg-[#0d0d0d] p-4 font-mono text-xs space-y-3">
                <div className="text-gray-500 flex items-center gap-2">
                  <span className="text-terminal-green">#</span> Example request using cURL
                </div>
                <div className="bg-black/50 p-3 text-gray-300 leading-relaxed overflow-x-auto whitespace-pre">
{`curl -X POST https://api.ignition.ai/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedModelId}",
    "prompt": "Hello via API"
  }'`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
