import { Request, Response } from 'express';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// In-Memory API Key Store (replace with DB later)
// ─────────────────────────────────────────────────────────────

interface ApiKeyRecord {
  key: string;
  modelId: string;
  walletAddress: string;
  hits: number;
  createdAt: Date;
}

// Map: apiKey string → record
const apiKeyStore = new Map<string, ApiKeyRecord>();

// ─────────────────────────────────────────────────────────────
// POST /api/apikeys/generate
// Body: { walletAddress: string, modelId: string }
// Generates a new API key scoped to a model for a wallet.
// ─────────────────────────────────────────────────────────────
export const generateApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress, modelId } = req.body;

    if (!walletAddress || !modelId) {
      res.status(400).json({ error: 'Missing walletAddress or modelId' });
      return;
    }

    // Generate a secure random key with model prefix
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const prefix = modelId.substring(0, 4).replace(/[^a-zA-Z0-9]/g, '');
    const apiKey = `ign_${prefix}_${randomBytes}`;

    const record: ApiKeyRecord = {
      key: apiKey,
      modelId,
      walletAddress,
      hits: 0,
      createdAt: new Date(),
    };

    apiKeyStore.set(apiKey, record);

    console.log(`[ApiKey] Generated key for wallet=${walletAddress} model=${modelId}`);

    res.status(201).json({
      apiKey: record.key,
      modelId: record.modelId,
      walletAddress: record.walletAddress,
      hits: record.hits,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('[ApiKey] Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/apikeys/hit
// Header: Authorization: Bearer <apiKey>
// Body: { prompt: string }
// Simulates an API hit — increments the counter and returns it.
// ─────────────────────────────────────────────────────────────
export const hitApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const apiKey = authHeader.split(' ')[1];
    const record = apiKeyStore.get(apiKey);

    if (!record) {
      res.status(403).json({ error: 'Invalid API key' });
      return;
    }

    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt in request body' });
      return;
    }

    // Increment counter
    record.hits += 1;
    apiKeyStore.set(apiKey, record);

    console.log(`[ApiKey] Hit #${record.hits} for key=${apiKey.substring(0, 12)}... model=${record.modelId}`);

    // Simulate a model response
    const simulatedResponse = `[${record.modelId}] Response to: "${prompt.substring(0, 60)}..." (hit #${record.hits})`;

    res.status(200).json({
      result: simulatedResponse,
      modelId: record.modelId,
      hits: record.hits,
    });
  } catch (error) {
    console.error('[ApiKey] Hit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/apikeys/stats
// Query: ?key=<apiKey>
// Returns the hit count and metadata for a given API key.
// ─────────────────────────────────────────────────────────────
export const getApiKeyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = req.query.key as string;

    if (!apiKey) {
      res.status(400).json({ error: 'Missing key query parameter' });
      return;
    }

    const record = apiKeyStore.get(apiKey);

    if (!record) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.status(200).json({
      apiKey: record.key,
      modelId: record.modelId,
      walletAddress: record.walletAddress,
      hits: record.hits,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('[ApiKey] Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
