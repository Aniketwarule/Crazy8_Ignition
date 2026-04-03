import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Loader2, Zap } from 'lucide-react'
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
    ? 'connect Pera Wallet to begin...'
    : !selectedModel
      ? 'select a model above...'
      : isProcessing
        ? 'processing...'
        : `prompt ${selectedModel.name} (${selectedModel.cost} ALGO)...`

  return (
    <div className="flex-shrink-0 border-t border-gray-700/60 bg-terminal-bg">
      {/* Cost indicator */}
      {selectedModel && isWalletConnected && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-700/20 bg-[#0d0d0d]">
          <Zap className="w-3 h-3 text-terminal-green" />
          <span className="text-[10px] font-mono text-gray-500">
            {selectedModel.destinationType === 'treasury' ? 'PREMIUM' : 'CREATOR'}
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            {selectedModel.name}
          </span>
          <span className="text-[10px] font-mono text-terminal-green font-bold ml-auto">
            {selectedModel.cost} ALGO/req
          </span>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3 px-4 py-3">
        {/* Terminal prefix */}
        <span className="text-green-500 font-mono text-sm font-bold pb-1.5 select-none text-shadow-green">
          $
        </span>

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!isWalletConnected || isProcessing || !selectedModel}
            rows={1}
            className="w-full bg-transparent text-white font-mono text-sm resize-none outline-none placeholder:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed leading-relaxed py-1"
            style={{ minHeight: '28px', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = '28px'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 border border-terminal-green/30 text-terminal-green hover:bg-terminal-green/10 hover:border-terminal-green disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Keyboard hint */}
      <div className="flex items-center justify-end px-4 pb-2">
        <span className="text-[9px] font-mono text-gray-500/40 tracking-wider">
          ENTER to send · SHIFT+ENTER for newline
        </span>
      </div>
    </div>
  )
}
