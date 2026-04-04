import { useEffect, useRef } from 'react'
import { Trash2, Sparkles } from 'lucide-react'
import TerminalLine from './TerminalLine'
import type { TerminalLogEntry, L402Step } from '../../types/l402'

interface TerminalWindowProps {
  logs: TerminalLogEntry[]
  currentStep: L402Step
  onClear: () => void
}

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
      {/* ─── Chat Header ─── */}
      {logs.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2 border-b border-border dark:border-border-dark">
          <span className="text-xs text-content-secondary dark:text-content-dark-secondary">
            {logs.length} message{logs.length !== 1 ? 's' : ''}
            {isProcessing && (
              <span className="ml-2 text-accent-green animate-pulse-slow">
                • {currentStep.replace('_', ' ')}
              </span>
            )}
          </span>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-accent-red hover:bg-accent-red/5 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {/* ─── Chat Body ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full select-none px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-secondary dark:bg-surface-dark-secondary flex items-center justify-center mb-6">
              <Sparkles className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <h2 className="font-serif text-2xl font-medium text-content dark:text-content-dark mb-2">
              Ask anything
            </h2>
            <p className="text-sm text-content-secondary dark:text-content-dark-secondary text-center max-w-sm">
              Select a model, connect your wallet, and start a conversation with premium AI.
            </p>
          </div>
        ) : (
          /* Message list */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {logs.map((entry) => (
              <TerminalLine key={entry.id} entry={entry} />
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 py-2 px-1">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Status Bar ─── */}
      <div className="flex items-center justify-center px-4 py-1.5 text-[10px] text-content-tertiary dark:text-content-dark-tertiary">
        {currentStep !== 'idle' && currentStep !== 'complete' && (
          <span className="uppercase tracking-wider">{currentStep.replace('_', ' ')}</span>
        )}
      </div>
    </div>
  )
}
