import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layers } from 'lucide-react'
import Header from './components/playground/Header'
import ModelSelector from './components/playground/ModelSelector'
import TerminalWindow from './components/playground/TerminalWindow'
import PromptInput from './components/playground/PromptInput'
import { usePeraWallet } from './hooks/usePeraWallet'
import { useDualL402 } from './hooks/useDualL402'
import type { AIModel, ModelCategory } from './types/models'

export default function Home() {
  const { isConnected } = usePeraWallet()
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const { state, logs, executePrompt, clearLogs } = useDualL402(selectedModel)
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as ModelCategory) || 'base'
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-surface dark:bg-surface-dark overflow-hidden transition-colors duration-300">
      <Header />
      <div className="flex flex-1 pt-16 min-h-0 relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`
            group fixed z-30 top-[7rem] flex items-center gap-1.5
            h-8 px-2 rounded-lg
            bg-white/80 dark:bg-[#232323]/80 backdrop-blur-md
            border border-black/[0.06] dark:border-white/[0.08]
            text-content-secondary dark:text-content-dark-secondary
            hover:bg-white dark:hover:bg-[#2a2a2a]
            shadow-md hover:shadow-lg
            transition-all duration-300
            ${sidebarOpen ? 'left-[18.5rem]' : 'left-3'}
          `}
          aria-label={sidebarOpen ? 'Collapse models' : 'Expand models'}
        >
          <Layers className="w-4 h-4 flex-shrink-0" />
          <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[6rem] group-hover:opacity-100 transition-all duration-300 text-xs font-medium whitespace-nowrap">
            {sidebarOpen ? 'Collapse' : 'Expand'}
          </span>
        </button>

        <ModelSelector
          selected={selectedModel}
          onSelect={setSelectedModel}
          initialTab={initialTab}
          isOpen={sidebarOpen}
        />

        {/* ─── Chat Area ─── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat messages */}
          <TerminalWindow
            logs={logs}
            currentStep={state.currentStep}
            onClear={clearLogs}
          />

          {/* Prompt input */}
          <PromptInput
            onSubmit={executePrompt}
            isProcessing={state.isProcessing}
            isWalletConnected={isConnected}
            selectedModel={selectedModel}
          />
        </div>
      </div>
    </div>
  )
}
