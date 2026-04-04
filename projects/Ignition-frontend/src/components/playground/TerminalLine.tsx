import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react'
import type { TerminalLogEntry } from '../../types/l402'

interface TerminalLineProps {
  entry: TerminalLogEntry
}

function StatusIcon({ status }: { status: TerminalLogEntry['status'] }) {
  switch (status) {
    case 'OK':
      return <CheckCircle2 className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
    case 'PENDING':
      return <Clock className="w-3.5 h-3.5 text-accent-orange animate-pulse-slow flex-shrink-0" />
    case 'FAIL':
      return <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
    case 'INFO':
      return <Info className="w-3.5 h-3.5 text-content-secondary dark:text-content-dark-secondary flex-shrink-0" />
    case 'INPUT':
    case 'STREAM':
      return null
    default:
      return null
  }
}

export default function TerminalLine({ entry }: TerminalLineProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const isInput = entry.status === 'INPUT'
  const isStream = entry.status === 'STREAM'
  const isAi = entry.isAiResponse
  const isSystem = !isInput && !isStream && !isAi

  return (
    <div
      className={`transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {isInput ? (
        /* User message — right-aligned bubble */
        <div className="flex justify-end">
          <div className="msg-user">
            {entry.message}
          </div>
        </div>
      ) : isAi || isStream ? (
        /* AI response — left-aligned */
        <div className="flex justify-start">
          <div className="msg-ai whitespace-pre-wrap">
            {entry.message}
          </div>
        </div>
      ) : (
        /* System/status message — centered */
        <div className="flex items-center justify-center gap-1.5">
          <StatusIcon status={entry.status} />
          <span className={`msg-system ${
            entry.status === 'FAIL' ? 'text-accent-red' : ''
          }`}>
            {entry.message}
          </span>
        </div>
      )}
    </div>
  )
}
