import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
      {/* ─── Floating Navbar ─── */}
      <Header />

      {/* ─── Main Content ─── */}
      <div className="flex flex-1 pt-16 min-h-0">
        {/* ─── Sidebar: Model Selector ─── */}
        <ModelSelector
          selected={selectedModel}
          onSelect={setSelectedModel}
          initialTab={initialTab}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
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
