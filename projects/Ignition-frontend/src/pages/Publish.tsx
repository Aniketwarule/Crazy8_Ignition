import { useState, useCallback, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  ArrowLeft,
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
import Header from '../components/playground/Header'
import { usePeraWallet } from '../hooks/usePeraWallet'
import { ellipseAddress } from '../utils/ellipseAddress'
import ApiService from '../utils/APIService'

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
      return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green/10 text-accent-green">Done</span>
    case 'PENDING':
      return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-orange/10 text-accent-orange animate-pulse-slow">Pending</span>
    case 'FAIL':
      return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-red/10 text-accent-red">Failed</span>
    case 'INFO':
      return <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-purple/10 text-accent-purple">Info</span>
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
    <div className="min-h-screen bg-surface dark:bg-surface-dark transition-colors">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {!isConnected ? (
          /* ─── Not Connected State ─── */
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="card p-8 max-w-md w-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-red/10 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-accent-red" />
              </div>
              <h2 className="text-lg font-semibold text-content dark:text-content-dark mb-2">
                Wallet Required
              </h2>
              <p className="text-sm text-content-secondary dark:text-content-dark-secondary mb-6">
                Connect your Pera Wallet to publish agents. Your wallet address serves as your creator identity.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary w-full flex items-center justify-center gap-2"
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
          /* ─── Deploy Progress ─── */
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl font-medium text-content dark:text-content-dark mb-2">
                {phase === 'deploying' ? 'Deploying Agent...' : phase === 'success' ? 'Agent Live!' : 'Deployment Failed'}
              </h1>
            </div>

            <div className="card p-6 space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 animate-fade-in">
                  {log.status === 'OK' && <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0" />}
                  {log.status === 'PENDING' && <Loader2 className="w-4 h-4 text-accent-orange animate-spin flex-shrink-0" />}
                  {log.status === 'FAIL' && <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />}
                  {log.status === 'INFO' && <Zap className="w-4 h-4 text-accent-purple flex-shrink-0" />}
                  <span className={`text-sm ${log.status === 'FAIL' ? 'text-accent-red' : 'text-content dark:text-content-dark'}`}>
                    {log.message}
                  </span>
                  <StatusBadge status={log.status} />
                </div>
              ))}

              {phase === 'deploying' && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {(phase === 'success' || phase === 'error') && (
              <div className="flex gap-3">
                <Link
                  to="/home"
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Playground
                </Link>
                {phase === 'error' && (
                  <button
                    onClick={() => { setPhase('idle'); setLogs([]) }}
                    className="btn-primary flex-1"
                  >
                    Retry
                  </button>
                )}
                {phase === 'success' && (
                  <button
                    onClick={() => { setPhase('idle'); setLogs([]); setForm(INITIAL_FORM) }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-4 h-4" />
                    Deploy Another
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ─── Publishing Form ─── */
          <form onSubmit={handleDeploy} className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl sm:text-4xl font-medium text-content dark:text-content-dark mb-2">
                Publish Agent
              </h1>
              <p className="text-sm text-content-secondary dark:text-content-dark-secondary">
                Register a custom AI agent to the marketplace
              </p>
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-content dark:text-content-dark">Agent Name</span>
                <span className="text-xs text-content-tertiary dark:text-content-dark-tertiary">{form.name.length}/30</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value.slice(0, 30))}
                placeholder="e.g. Smart Contract Auditor"
                className="input-field"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-content dark:text-content-dark">Description</span>
                <span className="text-xs text-content-tertiary dark:text-content-dark-tertiary">{form.description.length}/100</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value.slice(0, 100))}
                placeholder="Short description of what your agent does"
                className="input-field"
              />
            </div>

            {/* Hosting Type */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-content dark:text-content-dark">Hosting</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('hostingType', 'internal')}
                  className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                    form.hostingType === 'internal'
                      ? 'border-accent-green bg-accent-green/5 text-accent-green'
                      : 'border-border dark:border-border-dark text-content-secondary dark:text-content-dark-secondary hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Hosted by Ignition
                </button>
                <button
                  type="button"
                  onClick={() => updateField('hostingType', 'external')}
                  className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                    form.hostingType === 'external'
                      ? 'border-accent-purple bg-accent-purple/5 text-accent-purple'
                      : 'border-border dark:border-border-dark text-content-secondary dark:text-content-dark-secondary hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  Externally Hosted
                </button>
              </div>
            </div>

            {form.hostingType === 'internal' ? (
              <>
                {/* Base Model */}
                <div className="space-y-2 animate-fade-in">
                  <span className="text-sm font-medium text-content dark:text-content-dark">Base Model</span>
                  <div className="relative">
                    <select
                      value={form.baseModel}
                      onChange={(e) => updateField('baseModel', e.target.value)}
                      className="input-field appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select engine...</option>
                      {BASE_MODEL_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* API key */}
                <div className="space-y-2 animate-fade-in">
                  <span className="text-sm font-medium text-content dark:text-content-dark">Your API Key</span>
                  <input
                    type="url"
                    value={form.APIkey}
                    onChange={(e) => updateField('APIkey', e.target.value)}
                    placeholder="Enter your API key here"
                    className="input-field"
                  />
                </div>

                {/* System Prompt */}
                <div className="space-y-2 animate-fade-in">
                  <span className="text-sm font-medium text-content dark:text-content-dark">System Prompt</span>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => updateField('systemPrompt', e.target.value)}
                    placeholder="You are an expert smart contract auditor. Analyze the following TEAL code for vulnerabilities..."
                    rows={5}
                    className="input-field resize-y"
                  />
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-content-tertiary dark:text-content-dark-tertiary" />
                    <p className="text-[11px] text-content-tertiary dark:text-content-dark-tertiary">
                      Encrypted on our servers. Never exposed to clients.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Endpoint URL */}
                <div className="space-y-2 animate-fade-in">
                  <span className="text-sm font-medium text-content dark:text-content-dark">Endpoint URL</span>
                  <input
                    type="url"
                    value={form.endpointUrl}
                    onChange={(e) => updateField('endpointUrl', e.target.value)}
                    placeholder="https://api.yourdomain.com/v1/run"
                    className="input-field"
                  />
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-content-tertiary dark:text-content-dark-tertiary" />
                    <p className="text-[11px] text-content-tertiary dark:text-content-dark-tertiary">
                      Ignition acts as an L402 payment proxy to this URL.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Price */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-content dark:text-content-dark">Price per Request (ALGO)</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={form.priceAlgo}
                  onChange={(e) => updateField('priceAlgo', Math.max(0, parseFloat(e.target.value) || 0))}
                  step={0.1}
                  min={0.01}
                  className="input-field !w-32"
                />
                <span className="text-sm text-content-secondary dark:text-content-dark-secondary">
                  Users pay <span className="font-semibold text-accent-green">{form.priceAlgo}</span> ALGO
                </span>
              </div>
            </div>

            {/* Creator identity */}
            <div className="card p-4 flex items-center gap-3">
              <Cpu className="w-4 h-4 text-content-secondary dark:text-content-dark-secondary flex-shrink-0" />
              <div>
                <span className="text-xs text-content-secondary dark:text-content-dark-secondary">Creator Identity: </span>
                <span className="text-xs font-medium text-accent-green">
                  {ellipseAddress(address, 8)}
                </span>
              </div>
              <span className="text-[10px] text-content-tertiary dark:text-content-dark-tertiary ml-auto">
                Payments route here
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid}
              className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5"
            >
              <Rocket className="w-4 h-4" />
              Deploy Agent
            </button>

            {/* Preview */}
            {isFormValid && (
              <div className="card p-4 space-y-2 animate-fade-in">
                <p className="text-xs font-medium text-content-secondary dark:text-content-dark-secondary uppercase tracking-wider mb-2">Deploy Preview</p>
                <div className="text-sm space-y-1 text-content dark:text-content-dark">
                  <p><span className="text-content-secondary dark:text-content-dark-secondary">Name:</span> {form.name}</p>
                  {form.hostingType === 'internal' ? (
                    <p><span className="text-content-secondary dark:text-content-dark-secondary">Engine:</span> {BASE_MODEL_OPTIONS.find((m) => m.id === form.baseModel)?.name}</p>
                  ) : (
                    <p><span className="text-content-secondary dark:text-content-dark-secondary">Endpoint:</span> {form.endpointUrl}</p>
                  )}
                  <p><span className="text-content-secondary dark:text-content-dark-secondary">Price:</span> <span className="text-accent-green font-semibold">{form.priceAlgo} ALGO</span></p>
                  <p><span className="text-content-secondary dark:text-content-dark-secondary">Creator:</span> <span className="text-accent-green">{ellipseAddress(address, 6)}</span></p>
                </div>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  )
}

// ─── Utility ───

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
