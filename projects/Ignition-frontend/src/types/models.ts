// ─────────────────────────────────────────────────────
// Ignition — Dual-Mode AI Model Definitions
// ─────────────────────────────────────────────────────

/** Payment destination: Platform Treasury or Creator Wallet */
export type ModelDestination = 'treasury' | 'creator'

/** Model category for UI grouping */
export type ModelCategory = 'base' | 'community'

/** A single AI model/agent available on the platform */
export interface AIModel {
  id: string
  name: string
  description: string
  /** Cost in ALGO */
  cost: number
  /** Cost in microAlgos (1 ALGO = 1,000,000) */
  costMicroAlgos: number
  /** Where the payment goes */
  destinationType: ModelDestination
  /** Algorand address to receive payment */
  destinationAddress: string
  /** Creator handle (for community agents) */
  creator?: string
  /** Category for UI grouping */
  category: ModelCategory
}

// Platform treasury address
export const TREASURY_ADDRESS =
  import.meta.env.VITE_TREASURY_ADDRESS ||
  'IGNITIONTREASURY000000000000000000000000000000000000000000000000'

// ─── Premium Base Models (Aggregator) ───

export const BASE_MODELS: AIModel[] = [
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: "Google's multimodal reasoning model",
    cost: 0.1,
    costMicroAlgos: 100_000,
    destinationType: 'treasury',
    destinationAddress: TREASURY_ADDRESS,
    category: 'base',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: "OpenAI's flagship model",
    cost: 0.3,
    costMicroAlgos: 300_000,
    destinationType: 'treasury',
    destinationAddress: TREASURY_ADDRESS,
    category: 'base',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: "Anthropic's most capable model",
    cost: 0.4,
    costMicroAlgos: 400_000,
    destinationType: 'treasury',
    destinationAddress: TREASURY_ADDRESS,
    category: 'base',
  },
]

// ─── Community Creator Agents (Marketplace) ───

export const COMMUNITY_AGENTS: AIModel[] = [
  {
    id: 'sc-auditor-alice',
    name: 'Smart Contract Auditor',
    description: 'TEAL/PyTeal security audit agent',
    cost: 0.5,
    costMicroAlgos: 500_000,
    destinationType: 'creator',
    destinationAddress: 'ALICEAUDITOR00000000000000000000000000000000000000000000000000',
    creator: '@dev_alice',
    category: 'community',
  },
  {
    id: 'web3-copywriter-bob',
    name: 'Web3 Copywriter',
    description: 'Marketing copy for Web3 projects',
    cost: 0.2,
    costMicroAlgos: 200_000,
    destinationType: 'creator',
    destinationAddress: 'BOBCOPYWRITER00000000000000000000000000000000000000000000000000',
    creator: '@bob',
    category: 'community',
  },
]

export const ALL_MODELS: AIModel[] = [...BASE_MODELS, ...COMMUNITY_AGENTS]
