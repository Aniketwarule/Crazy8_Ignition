import { useState, useCallback, useEffect } from 'react'
import { Key, Copy, Check, RefreshCw, Shield, AlertCircle, ChevronDown, Code2 } from 'lucide-react'
import Header from '../components/playground/Header'
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
    <div className="min-h-screen bg-surface dark:bg-surface-dark transition-colors">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="card p-8 max-w-md w-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-orange/10 flex items-center justify-center mx-auto mb-5">
                <Shield className="w-7 h-7 text-accent-orange" />
              </div>
              <h2 className="text-lg font-semibold text-content dark:text-content-dark mb-2">
                Authentication Required
              </h2>
              <p className="text-sm text-content-secondary dark:text-content-dark-secondary mb-6">
                Connect your wallet to generate API credentials.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary w-full flex items-center justify-center gap-2"
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
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-content dark:text-content-dark mb-2">
                Developer API
              </h1>
              <p className="text-sm text-content-secondary dark:text-content-dark-secondary">
                Integrate Ignition AI models into your applications
              </p>
            </div>

            {/* Security Notice */}
            <div className="card p-4 border-accent-green/20 dark:border-accent-green/15 bg-accent-green/[0.03]">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-content dark:text-content-dark mb-1">Security Notice</p>
                  <p className="text-xs text-content-secondary dark:text-content-dark-secondary leading-relaxed">
                    Your API key is a sensitive credential. Never share it or commit it to version control.
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="card p-4 border-accent-red/20 bg-accent-red/[0.03] animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent-red mb-1">Connection Error</p>
                    <p className="text-xs text-accent-red/80">{error}</p>
                    <p className="text-xs text-content-tertiary dark:text-content-dark-tertiary mt-1">
                      Make sure the backend is running on {API_BASE}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-content dark:text-content-dark">Model Scope</span>
              <div className="relative">
                <select
                  value={selectedModelId}
                  onChange={(e) => {
                    setSelectedModelId(e.target.value)
                    setApiKey(null)
                    setHits(0)
                    setError(null)
                  }}
                  className="input-field appearance-none cursor-pointer"
                >
                  {BASE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} — {model.cost} ALGO/req
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-content-tertiary dark:text-content-dark-tertiary">
                The generated key will be constrained to the selected model only.
              </p>
            </div>

            {/* Key Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-content dark:text-content-dark">Your API Key</span>
                  {apiKey && (
                    <span className="badge badge-green text-[10px]">
                      {selectedModel?.name}
                    </span>
                  )}
                </div>
                {apiKey && (
                  <button
                    onClick={() => { setApiKey(null); setHits(0); generateKey(); }}
                    className="text-xs text-content-secondary dark:text-content-dark-secondary hover:text-accent-orange transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                )}
              </div>

              {!apiKey ? (
                <div className="card p-10 flex flex-col items-center justify-center text-center cursor-pointer group" onClick={generateKey}>
                  <div className="w-16 h-16 rounded-2xl bg-accent-green/5 dark:bg-accent-green/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {isGenerating ? (
                      <RefreshCw className="w-7 h-7 text-accent-green animate-spin" />
                    ) : (
                      <Key className="w-7 h-7 text-accent-green" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-content dark:text-content-dark mb-1">
                    {isGenerating ? 'Generating...' : 'Generate API Key'}
                  </p>
                  <p className="text-xs text-content-tertiary dark:text-content-dark-tertiary">
                    No transaction fee required
                  </p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <code className="text-sm text-accent-green font-mono break-all flex-1 mr-3">
                      IGNITION_API_KEY={apiKey}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className={`flex-shrink-0 p-2 rounded-lg border transition-all ${
                        copied
                          ? 'border-accent-green text-accent-green bg-accent-green/5'
                          : 'border-border dark:border-border-dark text-content-secondary dark:text-content-dark-secondary hover:border-gray-400'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Usage Stats */}
            {apiKey && (
              <div className="card p-5 space-y-4 animate-fade-in">
                <h3 className="text-sm font-medium text-content dark:text-content-dark">Usage Monitor</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-4 text-center !shadow-none">
                    <p className="text-2xl font-bold text-accent-green">{hits}</p>
                    <p className="text-[10px] text-content-secondary dark:text-content-dark-secondary mt-1 uppercase">Total Hits</p>
                  </div>
                  <div className="card p-4 text-center !shadow-none">
                    <p className="text-2xl font-bold text-accent-orange">
                      {(hits * (selectedModel?.cost || 0)).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-content-secondary dark:text-content-dark-secondary mt-1 uppercase">ALGO Accrued</p>
                  </div>
                  <div className="card p-4 text-center !shadow-none">
                    <p className="text-2xl font-bold text-accent-purple">
                      {selectedModel?.cost || 0}
                    </p>
                    <p className="text-[10px] text-content-secondary dark:text-content-dark-secondary mt-1 uppercase">ALGO / Req</p>
                  </div>
                </div>
                <p className="text-[10px] text-content-tertiary dark:text-content-dark-tertiary text-center">
                  Stats refresh every 5 seconds
                </p>
              </div>
            )}

            {/* Quick Start */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-content-secondary dark:text-content-dark-secondary" />
                <h3 className="text-sm font-medium text-content dark:text-content-dark">Quick Start</h3>
              </div>
              <div className="card overflow-hidden">
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-content-secondary dark:text-content-dark-secondary mb-2"># Example request</p>
                    <pre className="bg-surface-secondary dark:bg-surface-dark-tertiary p-3 rounded-lg text-xs text-content dark:text-content-dark overflow-x-auto font-mono leading-relaxed">
{`curl -X POST ${API_BASE}/api/apikeys/hit \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Hello via API"
  }'`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-content-secondary dark:text-content-dark-secondary mb-2"># Check usage stats</p>
                    <pre className="bg-surface-secondary dark:bg-surface-dark-tertiary p-3 rounded-lg text-xs text-content dark:text-content-dark overflow-x-auto font-mono">
{`curl ${API_BASE}/api/apikeys/stats?key=YOUR_API_KEY`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
