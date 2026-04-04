import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Loader2, Plus } from 'lucide-react'
import type { AIModel } from '../../types/models'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isProcessing: boolean
  isWalletConnected: boolean
  selectedModel: AIModel | null
}

export default function PromptInput({ onSubmit, isProcessing, isWalletConnected, selectedModel }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      const trimmed = prompt.trim()
      if (!trimmed || isProcessing) return
      onSubmit(trimmed)
      setPrompt('')
    },
    [prompt, isProcessing, onSubmit],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const canSubmit = prompt.trim().length > 0 && !isProcessing && isWalletConnected && !!selectedModel

  const placeholder = !isWalletConnected
    ? 'Connect wallet to begin...'
    : !selectedModel
      ? 'Select a model to start...'
      : isProcessing
        ? 'Processing...'
        : 'Ask anything...'

  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-2 relative">
      {/* ─── Floating model label ─── */}
      {selectedModel && (
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-surface-secondary dark:bg-surface-dark-tertiary text-content-secondary dark:text-content-dark-secondary border border-border dark:border-border-dark">
            {selectedModel.name}
            <span className="text-[10px] opacity-60">·</span>
            <span className="text-[10px] opacity-60">{selectedModel.cost} ALGO</span>
          </span>
        </div>
      )}

      {/* ─── Prompt bar ─── */}
      <form onSubmit={handleSubmit} className="prompt-bar">
        <div className="flex items-end gap-3 px-4 py-3">
          {/* Plus button */}
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-secondary dark:bg-surface-dark-tertiary flex items-center justify-center text-gray-400 hover:text-content dark:hover:text-content-dark hover:bg-surface-tertiary dark:hover:bg-surface-dark-secondary transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={!isWalletConnected || isProcessing || !selectedModel}
              rows={1}
              className="w-full bg-transparent text-content dark:text-content-dark text-sm resize-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed leading-relaxed py-1"
              style={{ minHeight: '28px', maxHeight: '120px' }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = '28px'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] dark:bg-white flex items-center justify-center text-white dark:text-[#1a1a1a] disabled:opacity-20 disabled:cursor-not-allowed hover:opacity-80 active:scale-95 transition-all"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Keyboard hint */}
      <div className="flex items-center justify-center mt-2">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Enter to send · Shift+Enter for newline
        </span>
      </div>
    </div>
  )
}
