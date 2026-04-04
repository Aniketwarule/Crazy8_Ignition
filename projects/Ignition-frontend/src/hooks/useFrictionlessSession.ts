import { useCallback, useMemo, useRef, useState } from 'react'
import algosdk from 'algosdk'
import { usePeraWallet } from './usePeraWallet'

const MAX_SESSION_AMOUNT_MICROALGOS = 1_000_000
const MAX_TX_FEE_MICROALGOS = 1_000
const DEFAULT_SESSION_BLOCKS = 1_000
const DEFAULT_SESSION_FUNDING_MICROALGOS = 1_000_000

type CompileResponse = {
  result: string
  hash: string
}

export interface DelegatedSessionState {
  isActive: boolean
  isStarting: boolean
  isPaying: boolean
  signerAddress: string | null
  logicSigAddress: string | null
  treasuryAddress: string | null
  expirationRound: number | null
  sessionProgramHash: string | null
  lastTxId: string | null
  error: string | null
}

export interface StartSessionResult {
  logicSigAddress: string
  expirationRound: number
}

export interface ExecutePromptPaymentResult {
  txId: string
  amountMicroAlgos: number
  expirationRound: number
}

type SignedDelegation = {
  logicSigAccount: algosdk.LogicSigAccount
  logicSigAddress: string
  expirationRound: number
  treasuryAddress: string
  ownerAddress: string
}

const toMicroAlgos = (algoAmount: number): number => {
  return Math.round(algoAmount * 1_000_000)
}

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const buildDelegateTeal = (treasuryAddress: string, expirationRound: number): string => {
  return `#pragma version 8

// Ignition delegated session payment approval
// Allow only payment txns to treasury, <= 1 ALGO, before expiration.
txn TypeEnum
int pay
==
txn Receiver
addr ${treasuryAddress}
==
&&
txn Amount
int ${MAX_SESSION_AMOUNT_MICROALGOS}
<=
&&
txn LastValid
int ${expirationRound}
<=
&&
txn Fee
int ${MAX_TX_FEE_MICROALGOS}
<=
&&
txn RekeyTo
global ZeroAddress
==
&&
txn CloseRemainderTo
global ZeroAddress
==
&&`
}

// Explicit helper to mirror the requested makeLogicSigAccount flow.
const makeLogicSigAccount = (program: Uint8Array): algosdk.LogicSigAccount => {
  return new algosdk.LogicSigAccount(program)
}

export function useFrictionlessSession() {
  const { address, peraWallet, getAlgodClient, refreshBalance } = usePeraWallet()

  const [state, setState] = useState<DelegatedSessionState>({
    isActive: false,
    isStarting: false,
    isPaying: false,
    signerAddress: null,
    logicSigAddress: null,
    treasuryAddress: null,
    expirationRound: null,
    sessionProgramHash: null,
    lastTxId: null,
    error: null,
  })

  const signedDelegationRef = useRef<SignedDelegation | null>(null)

  const clearSession = useCallback(() => {
    signedDelegationRef.current = null
    setState({
      isActive: false,
      isStarting: false,
      isPaying: false,
      signerAddress: null,
      logicSigAddress: null,
      treasuryAddress: null,
      expirationRound: null,
      sessionProgramHash: null,
      lastTxId: null,
      error: null,
    })
  }, [])

  const startSession = useCallback(async (durationInBlocks: number = DEFAULT_SESSION_BLOCKS): Promise<StartSessionResult> => {
    if (!address) {
      throw new Error('Connect Pera Wallet before starting a delegated session')
    }

    const treasuryAddress = (import.meta.env.VITE_IGNITION_TREASURY_ADDRESS || '').trim()
    if (!algosdk.isValidAddress(treasuryAddress)) {
      throw new Error('Invalid VITE_IGNITION_TREASURY_ADDRESS')
    }

    if (!Number.isFinite(durationInBlocks) || durationInBlocks <= 0) {
      throw new Error('durationInBlocks must be a positive number')
    }

    setState((prev) => ({ ...prev, isStarting: true, error: null }))

    try {
      const algod = getAlgodClient()
      const suggestedParams = await algod.getTransactionParams().do()
      const currentRound = Number(suggestedParams.firstValid)
      const expirationRound = currentRound + Math.floor(durationInBlocks)

      const tealSource = buildDelegateTeal(treasuryAddress, expirationRound)

      // This compile step converts the session-specific TealScript logic into executable AVM bytes.
      const compiled = await algod.compile(tealSource).do() as CompileResponse
      const programBytes = fromBase64(compiled.result)

      const logicSigAccount = makeLogicSigAccount(programBytes)
      if (!logicSigAccount.verify()) {
        throw new Error('LogicSig program verification failed')
      }

      const logicSigAddress = logicSigAccount.address().toString()

      // One-time wallet approval per session: fund the LogicSig account.
      const fundingTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: logicSigAddress,
        amount: DEFAULT_SESSION_FUNDING_MICROALGOS,
        suggestedParams,
        note: new TextEncoder().encode(`ignition:session-fund:${expirationRound}`),
      })

      const signedFunding = await peraWallet.signTransaction([
        [
          {
            txn: fundingTxn,
            signers: [address],
          },
        ],
      ])

      const fundingBlob = signedFunding[0]
      if (!fundingBlob) {
        throw new Error('Failed to sign session funding transaction')
      }

      const fundingSubmission = await algod.sendRawTransaction(fundingBlob).do() as { txId?: string }
      const fundingTxId = fundingSubmission.txId || fundingTxn.txID()
      await algosdk.waitForConfirmation(algod, fundingTxId, 4)
      await refreshBalance()

      signedDelegationRef.current = {
        logicSigAccount,
        logicSigAddress,
        expirationRound,
        treasuryAddress,
        ownerAddress: address,
      }

      setState({
        isActive: true,
        isStarting: false,
        isPaying: false,
        signerAddress: address,
        logicSigAddress,
        treasuryAddress,
        expirationRound,
        sessionProgramHash: compiled.hash,
        lastTxId: null,
        error: null,
      })

      return {
        logicSigAddress,
        expirationRound,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start delegated session'
      setState((prev) => ({ ...prev, isStarting: false, error: message, isActive: false }))
      throw error
    }
  }, [address, getAlgodClient, peraWallet, refreshBalance])

  const executePromptPayment = useCallback(async (modelPriceAlgo: number): Promise<ExecutePromptPaymentResult> => {
    const delegation = signedDelegationRef.current
    if (!delegation) {
      throw new Error('No active delegated session. Call startSession() first.')
    }

    if (!address || delegation.ownerAddress !== address) {
      throw new Error('Connected wallet does not match delegated session signer')
    }

    const amountMicroAlgos = toMicroAlgos(modelPriceAlgo)
    if (!Number.isFinite(amountMicroAlgos) || amountMicroAlgos <= 0) {
      throw new Error('Invalid model price')
    }

    if (amountMicroAlgos > MAX_SESSION_AMOUNT_MICROALGOS) {
      throw new Error('Model price exceeds delegated session ceiling of 1 ALGO')
    }

    setState((prev) => ({ ...prev, isPaying: true, error: null }))

    try {
      const algod = getAlgodClient()
      const suggestedParams = await algod.getTransactionParams().do()

      const txFirstValid = Number(suggestedParams.firstValid)
      const txLastValidCandidate = Number(suggestedParams.lastValid)
      const txLastValid = Math.min(txLastValidCandidate, delegation.expirationRound)

      if (txFirstValid > delegation.expirationRound || txLastValid < txFirstValid) {
        throw new Error('Delegated session expired; start a new session')
      }

      const adjustedParams = {
        ...suggestedParams,
        lastValid: typeof suggestedParams.lastValid === 'bigint' ? BigInt(txLastValid) : txLastValid,
      }

      const logicSigAccountInfo = await algod.accountInformation(delegation.logicSigAddress).do()
      const logicSigBalance = Number(logicSigAccountInfo.amount ?? 0)
      const requiredSpend = amountMicroAlgos + MAX_TX_FEE_MICROALGOS
      if (logicSigBalance < requiredSpend) {
        throw new Error('LogicSig session balance is low; start a new session to re-fund')
      }

      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: delegation.logicSigAddress,
        receiver: delegation.treasuryAddress,
        amount: amountMicroAlgos,
        suggestedParams: adjustedParams,
      })

      // Crucial bypass: sign with delegated LogicSig, not with Pera signTransaction popup.
      const signed = algosdk.signLogicSigTransactionObject(paymentTxn, delegation.logicSigAccount)

      const submission = await algod.sendRawTransaction(signed.blob).do() as { txId?: string }
      const txId = submission.txId || paymentTxn.txID()

      await algosdk.waitForConfirmation(algod, txId, 4)
      await refreshBalance()

      setState((prev) => ({ ...prev, isPaying: false, lastTxId: txId, error: null }))

      return {
        txId,
        amountMicroAlgos,
        expirationRound: delegation.expirationRound,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delegated payment failed'
      setState((prev) => ({ ...prev, isPaying: false, error: message }))
      throw error
    }
  }, [address, getAlgodClient, refreshBalance])

  const isSessionExpired = useMemo(() => {
    if (!state.isActive || !state.expirationRound) return false
    return false
  }, [state.expirationRound, state.isActive])

  return {
    state,
    isSessionExpired,
    startSession,
    executePromptPayment,
    clearSession,
  }
}
