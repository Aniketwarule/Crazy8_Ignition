import { useState, useCallback, useRef } from 'react'
import algosdk from 'algosdk'
import { usePeraWallet } from './usePeraWallet'
import type { TerminalLogEntry, L402Challenge, L402Step } from '../types/l402'
import type { AIModel } from '../types/models'

// ─────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────

const API_URL =
  import.meta.env.VITE_BASE_MODELS_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8080/api/base-models/generate'
const IGNITION_GATEWAY_APP_ID = Number(import.meta.env.VITE_IGNITION_GATEWAY_APP_ID || '0')
let _counter = 0

function log(
  message: string,
  status: TerminalLogEntry['status'],
  opts?: Partial<TerminalLogEntry>,
): TerminalLogEntry {
  return {
    id: `log-${Date.now()}-${_counter++}`,
    timestamp: Date.now(),
    message,
    status,
    ...opts,
  }
}

async function parseChallenge(res: Response): Promise<L402Challenge> {
  // Try x402 header first
  const header = res.headers.get('payment-required')
  if (header) {
    try {
      const parsed = JSON.parse(atob(header))
      return {
        amountMicroAlgos: parsed.amountMicroAlgos ?? Math.round((parsed.price ?? 0) * 1e6),
        amountAlgos: parsed.amountAlgos ?? parsed.price ?? 0,
        creatorAddress: parsed.creatorAddress ?? parsed.payTo ?? '',
        invoiceId: parsed.invoiceId ?? parsed.id ?? '',
        message: parsed.message ?? 'Payment required',
      }
    } catch { /* fall through */ }
  }
  // Fallback: JSON body
  const body = await res.json()
  const amountAlgos = Number(body.amountAlgos ?? body.requiredAmountAlgo ?? body.price ?? 0)
  return {
    amountMicroAlgos: body.amountMicroAlgos ?? body.requiredAmountMicroAlgos ?? Math.round(amountAlgos * 1e6),
    amountAlgos,
    creatorAddress: body.creatorAddress ?? body.destinationAddress ?? body.payTo ?? '',
    invoiceId: body.invoiceId ?? body.id ?? '',
    message: body.message ?? 'Payment required',
  }
}

function createPeraSigner(
  peraWallet: { signTransaction: (txGroups: Array<Array<{ txn: algosdk.Transaction; signers: string[] }>>) => Promise<Uint8Array[]> },
  address: string,
): algosdk.TransactionSigner {
  return async (txnGroup, indexesToSign) => {
    const txnsToSign = indexesToSign.map((index) => ({
      txn: txnGroup[index],
      signers: [address],
    }))
    return peraWallet.signTransaction([txnsToSign])
  }
}

// ─────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────

export interface DualL402State {
  isProcessing: boolean
  currentStep: L402Step
  txId: string | null
  error: string | null
}

export function useDualL402(selectedModel: AIModel | null) {
  const { address, peraWallet, getAlgodClient, refreshBalance } = usePeraWallet()

  const [state, setState] = useState<DualL402State>({
    isProcessing: false,
    currentStep: 'idle',
    txId: null,
    error: null,
  })
  const [logs, setLogs] = useState<TerminalLogEntry[]>([])
  const logsRef = useRef(logs)
  logsRef.current = logs

  const push = useCallback((msg: string, status: TerminalLogEntry['status'], opts?: Partial<TerminalLogEntry>) => {
    const entry = log(msg, status, opts)
    setLogs((prev) => [...prev, entry])
    return entry.id
  }, [])

  const patch = useCallback((id: string, updates: Partial<TerminalLogEntry>) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }, [])

  const setStep = useCallback((step: L402Step) => {
    setState((s) => ({ ...s, currentStep: step }))
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    setState({ isProcessing: false, currentStep: 'idle', txId: null, error: null })
  }, [])

  // ─── The Dual-Mode L402 Execution Loop ───

  const executePrompt = useCallback(
    async (prompt: string) => {
      if (!address) {
        push('ERROR: Connect Pera Wallet first.', 'FAIL')
        return
      }
      if (!selectedModel) {
        push('ERROR: Select a model first.', 'FAIL')
        return
      }
      if (selectedModel.category !== 'base') {
        push('ERROR: Community agents are not wired to this base-model endpoint yet.', 'FAIL')
        return
      }
      if (!IGNITION_GATEWAY_APP_ID) {
        push('ERROR: Missing VITE_IGNITION_GATEWAY_APP_ID in frontend env.', 'FAIL')
        return
      }

      const modelForBackend = selectedModel.id.startsWith('gemini') ? selectedModel.id : 'gemini-1.5-pro'
      if (modelForBackend !== selectedModel.id) {
        push(`INFO: Backend currently supports Gemini. Using ${modelForBackend}.`, 'INFO')
      }

      const treasuryAddress = import.meta.env.VITE_IGNITION_TREASURY_ADDRESS || selectedModel.destinationAddress
      if (!algosdk.isValidAddress(treasuryAddress)) {
        push('ERROR: Invalid treasury address. Set VITE_IGNITION_TREASURY_ADDRESS.', 'FAIL')
        return
      }

      setState({ isProcessing: true, currentStep: 'requesting', txId: null, error: null })

      // Log user input
      push(prompt, 'INPUT', { prefix: '$' })

      // Model context log
      const modeTag = selectedModel.destinationType === 'treasury' ? 'PREMIUM' : 'CREATOR'
      const destLabel = selectedModel.destinationType === 'treasury'
        ? 'Platform Treasury'
        : selectedModel.creator ?? 'Creator'
      push(`[${modeTag}] ${selectedModel.name} | ${selectedModel.cost} ALGO → ${destLabel}`, 'INFO')

      // ─── Step 1: POST to /api/base-models/generate ───
      const reqId = push(`POST ${API_URL} {model: "${modelForBackend}"} — awaiting...`, 'PENDING')

      let res: Response
      try {
        res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: modelForBackend }),
        })
      } catch {
        patch(reqId, { status: 'FAIL', message: `POST ${API_URL} — network error` })
        setState((s) => ({ ...s, isProcessing: false, currentStep: 'error', error: 'Network error' }))
        return
      }

      // ─── Step 2: Non-402 responses ───
      if (res.status !== 402) {
        if (res.ok) {
          patch(reqId, { status: 'OK', message: `POST — HTTP ${res.status}` })
          try {
            const data = await res.json()
            push(data.result || JSON.stringify(data), 'STREAM', { isAiResponse: true })
          } catch {
            push(await res.text(), 'STREAM', { isAiResponse: true })
          }
          setState((s) => ({ ...s, isProcessing: false, currentStep: 'complete' }))
          return
        }
        patch(reqId, { status: 'FAIL', message: `POST — HTTP ${res.status} ${res.statusText}` })
        setState((s) => ({ ...s, isProcessing: false, currentStep: 'error', error: res.statusText }))
        return
      }

      // ─── Step 3: HTTP 402 — Parse challenge ───
      patch(reqId, { status: 'OK', message: 'HTTP 402 — Payment Required' })
      setStep('payment_required')

      let challenge: L402Challenge
      try {
        challenge = await parseChallenge(res)
      } catch {
        push('Failed to parse payment challenge.', 'FAIL')
        setState((s) => ({ ...s, isProcessing: false, currentStep: 'error', error: 'Bad 402' }))
        return
      }

      const destAddr = treasuryAddress
      const amount = challenge.amountMicroAlgos || selectedModel.costMicroAlgos
      const amountAlgo = (amount / 1e6).toFixed(2)

      push(`Invoice: ${challenge.invoiceId} | ${amountAlgo} ALGO → ${destAddr.slice(0, 6)}...${destAddr.slice(-4)}`, 'INFO')

      // ─── Step 4: Build grouped payment + app-call transactions ───
      setStep('signing')
      const signId = push('Awaiting Pera Wallet signature...', 'PENDING')

      try {
        const algod = getAlgodClient()
        const params = await algod.getTransactionParams().do()
        const signer = createPeraSigner(peraWallet, address)

        const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: address,
          receiver: destAddr,
          amount: amount,
          suggestedParams: params,
          note: new TextEncoder().encode(`ignition:base:${selectedModel.id}:${challenge.invoiceId || Date.now()}`),
        })

        const atc = new algosdk.AtomicTransactionComposer()
        atc.addMethodCall({
          appID: IGNITION_GATEWAY_APP_ID,
          method: algosdk.ABIMethod.fromSignature('payForAi(pay)void'),
          sender: address,
          suggestedParams: params,
          signer,
          methodArgs: [{ txn: payTxn, signer }],
        })

        // ─── Step 5: Sign with Pera ───
        patch(signId, { status: 'OK', message: 'Wallet signature received' })

        // ─── Step 6: Broadcast ───
        setStep('broadcasting')
        const broadId = push('Broadcasting to Algorand...', 'PENDING')

        const atcResult = await atc.execute(algod, 4)
        const txId = atcResult.methodResults?.[0]?.txID || atcResult.txIDs[atcResult.txIDs.length - 1]
        if (!txId) {
          throw new Error('Unable to determine IgnitionGateway app call txId')
        }

        patch(broadId, { status: 'OK', message: 'Transaction confirmed on-chain' })
        push(`Gateway app-call TxID: ${txId}`, 'INFO')
        setState((s) => ({ ...s, txId }))

        // Refresh wallet balance
        refreshBalance()

        // ─── Step 7: Retry with payment proof ───
        setStep('verifying')
        const retryId = push('Retrying with payment proof...', 'PENDING')

        let retry: Response
        try {
          retry = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${txId}`,
            },
            body: JSON.stringify({ prompt, model: modelForBackend }),
          })
        } catch {
          patch(retryId, { status: 'FAIL', message: 'Retry failed — network error' })
          setState((s) => ({ ...s, isProcessing: false, currentStep: 'error', error: 'Retry failed' }))
          return
        }

        if (!retry.ok) {
          patch(retryId, { status: 'FAIL', message: `Retry — HTTP ${retry.status}` })
          setState((s) => ({ ...s, isProcessing: false, currentStep: 'error', error: 'Verification failed' }))
          return
        }

        patch(retryId, { status: 'OK', message: 'Payment verified — streaming response' })

        // ─── Step 8: Stream response ───
        setStep('streaming')
        const reader = retry.body?.getReader()
        if (reader) {
          const decoder = new TextDecoder()
          let full = ''
          const streamId = push('', 'STREAM', { isAiResponse: true })
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            full += decoder.decode(value, { stream: true })
            patch(streamId, { message: full })
          }
          if (!full) patch(streamId, { message: '[Empty response]', status: 'INFO' })
        } else {
          try {
            const data = await retry.json()
            push(data.result || JSON.stringify(data), 'STREAM', { isAiResponse: true })
          } catch {
            push(await retry.text(), 'STREAM', { isAiResponse: true })
          }
        }

        push('Generation complete.', 'OK')
        setState((s) => ({ ...s, isProcessing: false, currentStep: 'complete' }))
      } catch (err) {
        patch(signId, { status: 'FAIL', message: 'Transaction failed' })
        const msg = err instanceof Error ? err.message : 'Transaction error'
        push(`Error: ${msg}`, 'FAIL')
        setState((s) => ({ ...s, isProcessing: false, currentStep: 'error', error: msg }))
      }
    },
    [address, selectedModel, peraWallet, getAlgodClient, refreshBalance, push, patch, setStep],
  )

  return { state, logs, executePrompt, clearLogs }
}
