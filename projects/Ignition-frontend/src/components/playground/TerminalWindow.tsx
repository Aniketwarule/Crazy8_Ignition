import { useEffect, useRef } from 'react'
import { Terminal, Trash2 } from 'lucide-react'
import TerminalLine from './TerminalLine'
import type { TerminalLogEntry, L402Step } from '../../types/l402'

interface TerminalWindowProps {
  logs: TerminalLogEntry[]
  currentStep: L402Step
  onClear: () => void
}

const ASCII_ART = `
  ██╗ ██████╗ ███╗   ██╗██╗████████╗██╗ ██████╗ ███╗   ██╗
  ██║██╔════╝ ████╗  ██║██║╚══██╔══╝██║██╔═══██╗████╗  ██║
  ██║██║  ███╗██╔██╗ ██║██║   ██║   ██║██║   ██║██╔██╗ ██║
  ██║██║   ██║██║╚██╗██║██║   ██║   ██║██║   ██║██║╚██╗██║
  ██║╚██████╔╝██║ ╚████║██║   ██║   ██║╚██████╔╝██║ ╚████║
  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
`

export default function TerminalWindow({ logs, currentStep, onClear }: TerminalWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isProcessing = currentStep !== 'idle' && currentStep !== 'complete' && currentStep !== 'error'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ─── Terminal Chrome Bar ─── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/30 bg-[#0d0d0d]/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-1.5 ml-3">
            <Terminal className="w-3 h-3 text-gray-500" />
            <span className="text-[11px] font-mono text-gray-500">
              ~/ignition/playground
            </span>
          </div>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-500 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all duration-150 uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* ─── Terminal Body ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-terminal-bg">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full select-none">
            <pre className="text-terminal-green/20 text-[8px] sm:text-[10px] leading-none font-mono mb-6 hidden md:block">
              {ASCII_ART}
            </pre>
            <p className="text-terminal-green/30 text-xs font-mono mb-1">
              Decentralized Pay-Per-Use AI Gateway
            </p>
            <p className="text-gray-500 text-[11px] font-mono">
              {'>'} Select a model, connect Pera Wallet & type a prompt_
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((entry) => (
              <TerminalLine key={entry.id} entry={entry} />
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 py-0.5 px-1">
                <span className="text-gray-500">{'>'}</span>
                <span className="w-2 h-4 bg-terminal-green animate-blink" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Status Bar ─── */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-gray-700/30 bg-[#0d0d0d]/30 text-[10px] font-mono text-gray-500">
        <span>{logs.length} line{logs.length !== 1 ? 's' : ''}</span>
        <span className="uppercase tracking-wider">
          {currentStep === 'idle' ? 'ready' : currentStep.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}
