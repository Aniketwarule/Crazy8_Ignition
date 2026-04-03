import { useState } from 'react'
import Header from './components/playground/Header'
import ModelSelector from './components/playground/ModelSelector'
import TerminalWindow from './components/playground/TerminalWindow'
import PromptInput from './components/playground/PromptInput'
import { usePeraWallet } from './hooks/usePeraWallet'
import { useDualL402 } from './hooks/useDualL402'
import type { AIModel } from './types/models'

export default function Home() {
  const { isConnected } = usePeraWallet()
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const { state, logs, executePrompt, clearLogs } = useDualL402(selectedModel)

  return (
    <div className="flex flex-col h-screen bg-terminal-bg text-white overflow-hidden">
      {/* Scan-line CRT overlay */}
      <div className="scan-line-overlay" />

      {/* ─── Header ─── */}
      <Header />

      {/* ─── Model Selector ─── */}
      <ModelSelector selected={selectedModel} onSelect={setSelectedModel} />

      {/* ─── Terminal ─── */}
      <TerminalWindow
        logs={logs}
        currentStep={state.currentStep}
        onClear={clearLogs}
      />

      {/* ─── Input ─── */}
      <PromptInput
        onSubmit={executePrompt}
        isProcessing={state.isProcessing}
        isWalletConnected={isConnected}
        selectedModel={selectedModel}
      />
    </div>
  )
}
