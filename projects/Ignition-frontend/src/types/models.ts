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
  /** Cost in ALGO per request (legacy) */
  cost: number
  /** Cost in ALGO per 1000 tokens */
  tokenPrice: number
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
    cost: 0.01,
    tokenPrice: 0.01, // 0.01 ALGO per 1000 tokens
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: "Google's fast multimodal model",
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
    cost: 0.05,
    tokenPrice: 0.05, // 0.05 ALGO per 1000 tokens
    costMicroAlgos: 300_000,
    destinationType: 'treasury',
    destinationAddress: TREASURY_ADDRESS,
    category: 'base',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    description: "Anthropic's most capable model",
    cost: 0.08,
    tokenPrice: 0.08, // 0.08 ALGO per 1000 tokens
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
    description: 'TEAL/PyTeal security audit audit agent',
    cost: 0.01,
    tokenPrice: 0.1, // 0.1 ALGO per 1000 tokens
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
    cost: 0.04,
    tokenPrice: 0.04, // 0.04 ALGO per 1000 tokens
    costMicroAlgos: 200_000,
    destinationType: 'creator',
    destinationAddress: 'BOBCOPYWRITER00000000000000000000000000000000000000000000000000',
    creator: '@bob',
    category: 'community',
  },
]

export const ALL_MODELS: AIModel[] = [...BASE_MODELS, ...COMMUNITY_AGENTS]
