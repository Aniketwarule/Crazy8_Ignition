import { useEffect, useState } from 'react'
import type { TerminalLogEntry } from '../../types/l402'

interface TerminalLineProps {
  entry: TerminalLogEntry
}

function StatusBadge({ status }: { status: TerminalLogEntry['status'] }) {
  switch (status) {
    case 'OK':
      return <span className="badge-ok ml-2">[OK]</span>
    case 'PENDING':
      return <span className="badge-pending ml-2">[PENDING]</span>
    case 'FAIL':
      return <span className="badge-fail ml-2">[FAIL]</span>
    case 'INFO':
      return <span className="badge-info ml-2">[INFO]</span>
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

  const prefix = entry.prefix || '>'
  const isInput = entry.status === 'INPUT'
  const isStream = entry.status === 'STREAM'
  const isAi = entry.isAiResponse

  return (
    <div
      className={`flex items-start gap-2 py-0.5 px-1 font-mono text-[13px] leading-relaxed transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      } ${isAi ? 'pl-4 border-l border-terminal-green/15' : ''}`}
    >
      {/* Prefix */}
      <span
        className={`flex-shrink-0 select-none ${
          isInput
            ? 'text-terminal-green text-shadow-green'
            : isStream
              ? 'text-terminal-teal'
              : 'text-gray-500'
        }`}
      >
        {prefix}
      </span>

      {/* Message */}
      <span
        className={`flex-1 break-all whitespace-pre-wrap ${
          isInput
            ? 'text-white font-medium'
            : isAi
              ? 'text-white/90'
              : entry.status === 'FAIL'
                ? 'text-red-400/90'
                : entry.status === 'INFO'
                  ? 'text-gray-400'
                  : 'text-gray-400'
        }`}
      >
        {entry.message}
      </span>

      {/* Status badge */}
      <StatusBadge status={entry.status} />
    </div>
  )
}
