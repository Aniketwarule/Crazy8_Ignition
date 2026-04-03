import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { PeraWalletConnect } from '@perawallet/connect'
import algosdk from 'algosdk'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface PeraWalletState {
  address: string | null
  balance: number
  balanceMicroAlgos: number
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  /** Raw PeraWalletConnect instance for transaction signing */
  peraWallet: PeraWalletConnect
  /** Get a configured Algodv2 client */
  getAlgodClient: () => algosdk.Algodv2
  /** Refresh balance from chain */
  refreshBalance: () => Promise<void>
}

// ─────────────────────────────────────────────────────
// Singleton — one PeraWalletConnect instance per app
// ─────────────────────────────────────────────────────

let _instance: PeraWalletConnect | null = null
function getPeraInstance(): PeraWalletConnect {
  if (!_instance) {
    _instance = new PeraWalletConnect({ shouldShowSignTxnToast: true })
  }
  return _instance
}

// ─────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────

const PeraCtx = createContext<PeraWalletState | null>(null)

// ─────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────

export function PeraWalletProvider({ children }: { children: ReactNode }) {
  const peraRef = useRef(getPeraInstance())
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [balanceMicroAlgos, setBalanceMicroAlgos] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)

  const getAlgodClient = useCallback(() => {
    const cfg = getAlgodConfigFromViteEnvironment()
    return new algosdk.Algodv2(cfg.token as string, cfg.server, cfg.port)
  }, [])

  const fetchBalance = useCallback(
    async (addr: string) => {
      try {
        const client = getAlgodClient()
        const info = await client.accountInformation(addr).do()
        const micro = Number(info.amount ?? info['amount'] ?? 0)
        setBalanceMicroAlgos(micro)
        setBalance(micro / 1_000_000)
      } catch (err) {
        console.warn('[Pera] Balance fetch failed:', err)
      }
    },
    [getAlgodClient],
  )

  const refreshBalance = useCallback(async () => {
    if (address) await fetchBalance(address)
  }, [address, fetchBalance])

  const handleDisconnect = useCallback(() => {
    setAddress(null)
    setBalance(0)
    setBalanceMicroAlgos(0)
  }, [])

  // Reconnect previous session on mount
  useEffect(() => {
    const pera = peraRef.current
    pera
      .reconnectSession()
      .then((accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0])
          fetchBalance(accounts[0])
        }
        pera.connector?.on('disconnect', handleDisconnect)
      })
      .catch(() => {
        /* no previous session */
      })
  }, [fetchBalance, handleDisconnect])

  const connect = useCallback(async () => {
    const pera = peraRef.current
    setIsConnecting(true)
    try {
      const accounts = await pera.connect()
      if (accounts.length > 0) {
        setAddress(accounts[0])
        fetchBalance(accounts[0])
      }
      pera.connector?.on('disconnect', handleDisconnect)
    } catch (err) {
      if ((err as Error)?.message?.includes('cancelled')) {
        console.log('[Pera] User cancelled connection')
      } else {
        console.error('[Pera] Connection failed:', err)
      }
    } finally {
      setIsConnecting(false)
    }
  }, [fetchBalance, handleDisconnect])

  const disconnect = useCallback(() => {
    peraRef.current.disconnect()
    handleDisconnect()
  }, [handleDisconnect])

  return (
    <PeraCtx.Provider
      value={{
        address,
        balance,
        balanceMicroAlgos,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
        peraWallet: peraRef.current,
        getAlgodClient,
        refreshBalance,
      }}
    >
      {children}
    </PeraCtx.Provider>
  )
}

// ─────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────

export function usePeraWallet(): PeraWalletState {
  const ctx = useContext(PeraCtx)
  if (!ctx) {
    throw new Error('usePeraWallet must be used within <PeraWalletProvider>')
  }
  return ctx
}
