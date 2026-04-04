import { useState, useCallback } from 'react'
import { Shield, ShieldCheck } from 'lucide-react'
import type { AllowanceState } from '../../types/l402'

export default function AllowanceToggle() {
  const [allowance, setAllowance] = useState<AllowanceState>({
    enabled: false,
    remainingMicroAlgos: 10_000_000, // 10 ALGO
    totalMicroAlgos: 10_000_000,
    logicSigAddress: null,
  })

  const handleToggle = useCallback(async () => {
    if (allowance.enabled) {
      setAllowance((prev) => ({
        ...prev,
        enabled: false,
        logicSigAddress: null,
      }))
      return
    }

    setAllowance((prev) => ({
      ...prev,
      enabled: true,
      remainingMicroAlgos: 10_000_000,
      logicSigAddress: null,
    }))

    console.log('[Ignition] Auto-pay enabled — LogicSig placeholder. TEAL contract not yet implemented.')
  }, [allowance.enabled])

  const remainingAlgos = (allowance.remainingMicroAlgos / 1_000_000).toFixed(2)
  const percentage = (allowance.remainingMicroAlgos / allowance.totalMicroAlgos) * 100

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border dark:border-border-dark">
      <div className="flex items-center gap-3">
        {/* Toggle */}
        <button
          onClick={handleToggle}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
            allowance.enabled
              ? 'bg-accent-green'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
          aria-label="Toggle auto-pay"
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
              allowance.enabled ? 'left-[calc(100%-18px)]' : 'left-0.5'
            }`}
          />
        </button>

        {/* Label */}
        <div className="flex items-center gap-1.5">
          {allowance.enabled ? (
            <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
          ) : (
            <Shield className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          )}
          <span className={`text-xs font-medium ${
            allowance.enabled ? 'text-accent-green' : 'text-gray-400 dark:text-gray-500'
          }`}>
            Auto-Pay
          </span>
        </div>
      </div>

      {/* Allowance indicator */}
      {allowance.enabled && (
        <div className="flex items-center gap-3">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-accent-green">
            {remainingAlgos} ALGO
          </span>
        </div>
      )}
    </div>
  )
}
