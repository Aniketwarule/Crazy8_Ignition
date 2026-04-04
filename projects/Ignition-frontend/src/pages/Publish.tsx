import { useState, useCallback, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  ArrowLeft,
  Terminal,
  Shield,
  Rocket,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Lock,
  Cpu,
  Key,
} from 'lucide-react'
import { usePeraWallet } from '../hooks/usePeraWallet'
import { ellipseAddress } from '../utils/ellipseAddress'
import ApiService from '../utils/apiservice'

interface AgentFormState {
  name: string
  description: string
  hostingType: 'internal' | 'external'
  baseModel: string
  systemPrompt: string
  endpointUrl: string
  priceAlgo: number
  APIkey: string
}

interface DeployLog {
  id: string
  message: string
  status: 'PENDING' | 'OK' | 'FAIL' | 'INFO'
}

type DeployPhase = 'idle' | 'deploying' | 'success' | 'error'

const BASE_MODEL_OPTIONS = [
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' },
] as const

const INITIAL_FORM: AgentFormState = {
  name: '',
  description: '',
  hostingType: 'internal',
  baseModel: '',
  systemPrompt: '',
  endpointUrl: '',
  priceAlgo: 0.1,
  APIkey: ''
}

function StatusBadge({ status }: { status: DeployLog['status'] }) {
  switch (status) {
    case 'OK':
      return <span className="text-green-500 font-bold ml-2">[OK]</span>
    case 'PENDING':
      return <span className="text-yellow-400 font-bold ml-2 animate-pulse">[PENDING]</span>
    case 'FAIL':
      return <span className="text-red-400 font-bold ml-2">[FAIL]</span>
    case 'INFO':
      return <span className="text-cyan-400 font-bold ml-2">[INFO]</span>
  }
}


export default function Publish() {
  const { address, isConnected, connect, isConnecting } = usePeraWallet()

  const [form, setForm] = useState<AgentFormState>(INITIAL_FORM)
  const [phase, setPhase] = useState<DeployPhase>('idle')
  const [logs, setLogs] = useState<DeployLog[]>([])

  const updateField = useCallback(
    <K extends keyof AgentFormState>(key: K, value: AgentFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const pushLog = useCallback((message: string, status: DeployLog['status']) => {
    const entry: DeployLog = { id: `dl-${Date.now()}-${Math.random()}`, message, status }
    setLogs((prev) => [...prev, entry])
    return entry.id
  }, [])

  const patchLog = useCallback((id: string, updates: Partial<DeployLog>) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }, [])

  const handleDeploy = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!address || !form.name) return;
      if (form.hostingType === 'internal' && (!form.baseModel || !form.systemPrompt)) return;
      if (form.hostingType === 'external' && !form.endpointUrl) return;

      setPhase('deploying')
      setLogs([])

      const payload = {
        ...form,
        creatorWallet: address,
      }

      const v = pushLog('Validating agent configuration...', 'PENDING')
      await sleep(400)
      patchLog(v, { status: 'OK', message: 'Configuration valid' })
      const reg = pushLog(`POST /api/agents/create — pushing to registry...`, 'PENDING')

      try {
        await ApiService.publishAgent(payload);
        console.log("Agent published successfully")
        patchLog(reg, { status: 'OK', message: 'Agent saved to MongoDB successfully' })
        console.log("Agent saved to MongoDB successfully")
        pushLog(`Agent "${form.name}" is now live!`, 'INFO')
        console.log("Agent is now live")
        setPhase('success')
        console.log("Deployment successful")
      } catch (err: any) {
        patchLog(reg, {
          status: 'FAIL',
            message: `Deployment failed: ${err.message}`
        })
        setPhase('error')
      }
    },
    [address, form, pushLog, patchLog]
  )

  const isFormValid =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.priceAlgo > 0 &&
    (form.hostingType === 'internal'
      ? form.baseModel.length > 0 && form.systemPrompt.trim().length > 0
      : form.endpointUrl.trim().length > 0)



  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <div className="scan-line-overlay" />

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
          <Link
            to="/api-key"
            className="flex items-center gap-1.5 text-gray-500 hover:text-terminal-green transition-colors text-xs font-mono uppercase tracking-wider"
          >
            <Key className="w-3.5 h-3.5" />
            API Access
          </Link>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-terminal-green" strokeWidth={2.5} />
            <h1 className="font-sans font-bold text-sm tracking-[0.15em] text-white uppercase">
              Creator Portal
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
          /* ─── Not Connected State ─── */
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="max-w-lg w-full border border-gray-700 p-8 bg-[#0d0d0d]">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="font-mono text-sm text-red-400 font-bold uppercase tracking-wider">
                  Access Denied
                </span>
              </div>
              <div className="font-mono text-sm space-y-2 mb-8">
                <p className="text-gray-400">
                  <span className="text-red-400">{'>'}</span> ERROR: NO_IDENTITY_FOUND
                </p>
                <p className="text-gray-500">
                  <span className="text-gray-600">{'>'}</span> Please connect Pera Wallet to publish agents.
                </p>
                <p className="text-gray-500">
                  <span className="text-gray-600">{'>'}</span> Your wallet address serves as your creator identity.
                </p>
              </div>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:border-terminal-green disabled:opacity-50 transition-all duration-150 font-mono text-sm uppercase tracking-wider"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Pera Wallet'}
              </button>
            </div>
          </div>
        ) : phase === 'deploying' || phase === 'success' || phase === 'error' ? (
          /* ─── Deploy Terminal Output ─── */
          <div className="max-w-2xl mx-auto p-6 mt-8">
            <div className="border border-gray-700">
              {/* Chrome bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/50 bg-[#0d0d0d]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <Terminal className="w-3 h-3 text-gray-500 ml-2" />
                <span className="text-[11px] font-mono text-gray-500">~/ignition/deploy</span>
              </div>

              {/* Logs */}
              <div className="p-4 bg-[#0A0A0A] space-y-1 font-mono text-[13px]">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 animate-fade-in">
                    <span className="text-gray-500 select-none">{'>'}</span>
                    <span className={log.status === 'FAIL' ? 'text-red-400' : log.status === 'INFO' ? 'text-gray-400' : 'text-gray-400'}>
                      {log.message}
                    </span>
                    <StatusBadge status={log.status} />
                  </div>
                ))}

                {phase === 'deploying' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-gray-500">{'>'}</span>
                    <span className="w-2 h-4 bg-terminal-green animate-blink" />
                  </div>
                )}
              </div>
            </div>

            {/* Post-deploy actions */}
            {(phase === 'success' || phase === 'error') && (
              <div className="flex gap-3 mt-4">
                <Link
                  to="/"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all font-mono text-xs uppercase tracking-wider"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Playground
                </Link>
                {phase === 'error' && (
                  <button
                    onClick={() => { setPhase('idle'); setLogs([]) }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 transition-all font-mono text-xs uppercase tracking-wider"
                  >
                    Retry
                  </button>
                )}
                {phase === 'success' && (
                  <button
                    onClick={() => { setPhase('idle'); setLogs([]); setForm(INITIAL_FORM) }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 transition-all font-mono text-xs uppercase tracking-wider"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    Deploy Another
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ─── Publishing Form ─── */
          <form onSubmit={handleDeploy} className="max-w-2xl mx-auto p-6 mt-4 space-y-6">
            {/* Section header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-700/40">
              <Rocket className="w-5 h-5 text-terminal-green" />
              <div>
                <h2 className="font-sans font-bold text-lg text-white">Publish Agent</h2>
                <p className="text-xs font-mono text-gray-500 mt-0.5">
                  Register a custom AI agent to the Community Agents marketplace
                </p>
              </div>
            </div>

            {/* Agent Name */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Agent Name</span>
                <span className="text-[10px] font-mono text-gray-600">{form.name.length}/30</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value.slice(0, 30))}
                placeholder="e.g. Smart Contract Auditor"
                className="w-full px-3 py-2.5 bg-transparent border border-gray-700 text-white font-mono text-sm outline-none placeholder:text-gray-500 focus:border-terminal-green/50 transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Description</span>
                <span className="text-[10px] font-mono text-gray-600">{form.description.length}/100</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value.slice(0, 100))}
                placeholder="Short description of what your agent does"
                className="w-full px-3 py-2.5 bg-transparent border border-gray-700 text-white font-mono text-sm outline-none placeholder:text-gray-500 focus:border-terminal-green/50 transition-colors"
              />
            </div>

            {/* Hosting Type Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Hosting Architecture
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField('hostingType', 'internal')}
                  className={`flex-1 py-3 px-4 border text-center font-mono text-xs uppercase tracking-wider transition-all ${
                    form.hostingType === 'internal'
                      ? 'border-terminal-green bg-terminal-green/5 text-terminal-green'
                      : 'border-gray-700/60 bg-transparent text-gray-500 hover:border-gray-600'
                  }`}
                >
                  Hosted by Ignition
                </button>
                <button
                  type="button"
                  onClick={() => updateField('hostingType', 'external')}
                  className={`flex-1 py-3 px-4 border text-center font-mono text-xs uppercase tracking-wider transition-all ${
                    form.hostingType === 'external'
                      ? 'border-purple-400 bg-purple-400/5 text-purple-400'
                      : 'border-gray-700/60 bg-transparent text-gray-500 hover:border-gray-600'
                  }`}
                >
                  Externally Hosted
                </button>
              </div>
            </div>

            {form.hostingType === 'internal' ? (
              <>
                {/* Base Model */}
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Base Model Engine
                  </label>
                  <div className="relative">
                    <select
                      value={form.baseModel}
                      onChange={(e) => updateField('baseModel', e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-gray-700 text-white font-mono text-sm outline-none appearance-none cursor-pointer focus:border-terminal-green/50 transition-colors"
                    >
                      <option value="" disabled className="text-gray-500">
                        Select engine...
                      </option>
                      {BASE_MODEL_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#0A0A0A]">
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* API key URL */}
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Your API key
                  </label>
                  <input
                    type="url"
                    value={form.APIkey}
                    onChange={(e) => updateField('APIkey', e.target.value)}
                    placeholder="Enter your API key here"
                    className="w-full px-3 py-2.5 bg-transparent border border-gray-700 text-white font-mono text-sm outline-none placeholder:text-gray-500 focus:border-purple-400/50 transition-colors"
                  />
                </div>

                {/* System Prompt */}
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    System Prompt
                  </label>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => updateField('systemPrompt', e.target.value)}
                    placeholder="You are an expert smart contract auditor. Analyze the following TEAL code for vulnerabilities..."
                    rows={6}
                    className="w-full px-3 py-2.5 bg-transparent border border-gray-700 text-white font-mono text-sm outline-none resize-y placeholder:text-gray-500 focus:border-terminal-green/50 transition-colors leading-relaxed"
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <Lock className="w-3 h-3 text-gray-600" />
                    <p className="text-[10px] font-mono text-gray-600">
                      Your IP is secure. This system prompt is encrypted on our servers and never exposed to the client.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Endpoint URL */}
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={form.endpointUrl}
                    onChange={(e) => updateField('endpointUrl', e.target.value)}
                    placeholder="https://api.yourdomain.com/v1/run"
                    className="w-full px-3 py-2.5 bg-transparent border border-gray-700 text-white font-mono text-sm outline-none placeholder:text-gray-500 focus:border-purple-400/50 transition-colors"
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="w-3 h-3 text-gray-600" />
                    <p className="text-[10px] font-mono text-gray-600">
                      Ignition will act as an L402 payment proxy to this URL.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Price per Request (ALGO)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={form.priceAlgo}
                  onChange={(e) => updateField('priceAlgo', Math.max(0, parseFloat(e.target.value) || 0))}
                  step={0.1}
                  min={0.01}
                  className="w-36 px-3 py-2.5 bg-transparent border border-gray-700 text-white font-mono text-sm outline-none focus:border-terminal-green/50 transition-colors"
                />
                <span className="text-xs font-mono text-gray-500">
                  Users pay <span className="text-terminal-green font-bold">{form.priceAlgo}</span> ALGO per prompt
                </span>
              </div>
            </div>

            {/* Creator identity */}
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-700/40 bg-[#0d0d0d]">
              <Cpu className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[11px] font-mono text-gray-500">Creator Identity:</span>
              <span className="text-[11px] font-mono text-terminal-green">
                {ellipseAddress(address, 8)}
              </span>
              <span className="text-[10px] font-mono text-gray-600 ml-auto">
                Payments route to this address
              </span>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-terminal-green/40 bg-terminal-green/5 text-terminal-green hover:bg-terminal-green/10 hover:border-terminal-green disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-terminal-green/5 disabled:hover:border-terminal-green/40 transition-all duration-150 font-mono text-sm uppercase tracking-wider"
              >
                <Rocket className="w-4 h-4" />
                Deploy Agent
              </button>
            </div>

            {/* Preview summary */}
            {isFormValid && (
              <div className="border border-gray-700/30 p-3 bg-[#0d0d0d] font-mono text-[11px] space-y-0.5 animate-fade-in">
                <p className="text-gray-500 mb-1 uppercase tracking-wider text-[10px]">Deploy Preview</p>
                <p className="text-gray-400">
                  <span className="text-gray-600">{'>'}</span> name: <span className="text-white">{form.name}</span>
                </p>
                {form.hostingType === 'internal' ? (
                  <p className="text-gray-400">
                    <span className="text-gray-600">{'>'}</span> engine: <span className="text-white">{BASE_MODEL_OPTIONS.find((m) => m.id === form.baseModel)?.name}</span>
                  </p>
                ) : (
                  <p className="text-gray-400">
                    <span className="text-gray-600">{'>'}</span> endpoint: <span className="text-white">{form.endpointUrl}</span>
                  </p>
                )}
                <p className="text-gray-400">
                  <span className="text-gray-600">{'>'}</span> price: <span className="text-green-500">{form.priceAlgo} ALGO</span>
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-600">{'>'}</span> creator: <span className="text-green-500">{ellipseAddress(address, 6)}</span>
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Utility ───

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
