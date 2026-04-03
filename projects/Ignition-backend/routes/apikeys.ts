import { Request, Response } from 'express';
import crypto from 'crypto';
import { OpenAI } from 'openai';
import ApiKeyModel from '../models/ApiKey';
import UsageLog from '../models/UsageLog';

// ─────────────────────────────────────────────────────────────
// HuggingFace Model Mapping
// Maps our internal model IDs → HuggingFace router model slugs
// ─────────────────────────────────────────────────────────────

const HF_MODEL_MAP: Record<string, string> = {
  'gemini-1.5-pro':  'openai/gpt-oss-120b:groq',
  'gpt-4o':          'openai/gpt-oss-120b:groq',
  'claude-3-opus':   'openai/gpt-oss-120b:groq',
};

// Pricing in ALGO per 1000 tokens
const TOKEN_PRICE_MAP: Record<string, number> = {
  'gemini-1.5-pro': 0.01,
  'gpt-4o': 0.05,
  'claude-3-opus': 0.08,
};

// ─────────────────────────────────────────────────────────────
// Lazy-init the OpenAI client (HuggingFace Router)
// ─────────────────────────────────────────────────────────────

let _hfClient: OpenAI | null = null;
function getHFClient(): OpenAI {
  if (!_hfClient) {
    const token = process.env.HF_TOKEN;
    if (!token) {
      throw new Error('HF_TOKEN is not set in environment variables');
    }
    _hfClient = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: token,
    });
  }
  return _hfClient;
}

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

    const hfModel = HF_MODEL_MAP[modelId];
    if (!hfModel) {
      res.status(400).json({ error: `Model "${modelId}" is not supported for API key generation` });
      return;
    }

    const randomBytes = crypto.randomBytes(24).toString('hex');
    const prefix = modelId.substring(0, 4).replace(/[^a-zA-Z0-9]/g, '');
    const apiKey = `ign_${prefix}_${randomBytes}`;

    const record = await ApiKeyModel.create({
      key: apiKey,
      modelId,
      hfModel,
      walletAddress,
      hits: 0,
      totalTokens: 0,
      accruedAlgo: 0,
      isActive: true,
    });

    console.log(`[ApiKey] Generated key for wallet=${walletAddress} model=${modelId} → hf=${hfModel}`);

    res.status(201).json({
      apiKey: record.key,
      modelId: record.modelId,
      walletAddress: record.walletAddress,
      hits: record.hits,
      accruedAlgo: record.accruedAlgo,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('[ApiKey] Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/apikeys/chat
// Header: Authorization: Bearer <apiKey>
// Body: { messages: [{role, content}], model?: string }
// Proxies to HuggingFace router and returns the response.
// Traces every call in MongoDB.
// ─────────────────────────────────────────────────────────────
export const chatCompletion = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    // ── Auth ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const apiKey = authHeader.split(' ')[1];
    const record = await ApiKeyModel.findOne({ key: apiKey, isActive: true });

    if (!record) {
      res.status(403).json({ error: 'Invalid or revoked API key' });
      return;
    }

    // ── Parse request body ──
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Missing or invalid "messages" array in request body' });
      return;
    }

    // Use the model tied to the key (ignore client-supplied model override)
    const hfModel = record.hfModel;
    const promptSnippet = messages[messages.length - 1]?.content?.substring(0, 200) || '';

    console.log(`[Chat] key=${apiKey.substring(0, 16)}... model=${hfModel} prompt="${promptSnippet.substring(0, 60)}..."`);

    // ── Call HuggingFace ──
    const client = getHFClient();
    const chatResponse = await client.chat.completions.create({
      model: hfModel,
      messages: messages,
    });

    const latencyMs = Date.now() - startTime;
    const choice = chatResponse.choices?.[0];
    const responseContent = choice?.message?.content || '';
    const usage = chatResponse.usage;

    // ── Billing Calculation ──
    const totalTokens = usage?.total_tokens || 0;
    const tokenPrice = TOKEN_PRICE_MAP[record.modelId] || 0.01; 
    const cost = (totalTokens / 1000) * tokenPrice;

    // ── Update counters ──
    record.hits += 1;
    record.totalTokens += totalTokens;
    record.accruedAlgo += cost;
    await record.save();

    // ── Trace usage to MongoDB ──
    await UsageLog.create({
      apiKey: apiKey.substring(0, 16) + '***',
      modelId: record.modelId,
      hfModel,
      walletAddress: record.walletAddress,
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: totalTokens,
      promptSnippet: promptSnippet.substring(0, 200),
      responseSnippet: responseContent.substring(0, 200),
      latencyMs,
      status: 'success',
    });

    console.log(`[Chat] ✓ hit #${record.hits} | ${totalTokens} tokens | cost=${cost.toFixed(6)} ALGO | ${latencyMs}ms`);

    // ── Return OpenAI-compatible response ──
    res.status(200).json({
      id: chatResponse.id,
      object: 'chat.completion',
      created: chatResponse.created,
      model: record.modelId,
      choices: chatResponse.choices,
      usage: chatResponse.usage,
    });

  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('[Chat] Error:', error?.message || error);

    // Try to log the failure
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.split(' ')[1];
        const record = await ApiKeyModel.findOne({ key: apiKey });
        if (record) {
          await UsageLog.create({
            apiKey: apiKey.substring(0, 16) + '***',
            modelId: record.modelId,
            hfModel: record.hfModel,
            walletAddress: record.walletAddress,
            promptSnippet: '',
            responseSnippet: '',
            latencyMs,
            status: 'error',
            errorMessage: error?.message?.substring(0, 500),
          });
        }
      }
    } catch (_) {}

    if (error?.status === 429) {
      res.status(429).json({ error: 'Rate limited by upstream model provider. Try again shortly.' });
      return;
    }
    res.status(500).json({ error: 'Failed to get model response', detail: error?.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/apikeys/hit  (Legacy / simple prompt endpoint)
// Header: Authorization: Bearer <apiKey>
// Body: { prompt: string }
// ─────────────────────────────────────────────────────────────
export const hitApiKey = async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }
  req.body.messages = [{ role: 'user', content: prompt }];
  await chatCompletion(req, res);
};

// ─────────────────────────────────────────────────────────────
// GET /api/apikeys/stats
// Query: ?key=<apiKey>
// ─────────────────────────────────────────────────────────────
export const getApiKeyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = req.query.key as string;
    if (!apiKey) {
      res.status(400).json({ error: 'Missing key' });
      return;
    }

    const record = await ApiKeyModel.findOne({ key: apiKey });
    if (!record) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    const recentLogs = await UsageLog.find({
      apiKey: apiKey.substring(0, 16) + '***',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      apiKey: record.key,
      modelId: record.modelId,
      walletAddress: record.walletAddress,
      hits: record.hits,
      totalTokens: record.totalTokens,
      accruedAlgo: record.accruedAlgo,
      isActive: record.isActive,
      createdAt: record.createdAt,
      recentUsage: recentLogs,
    });
  } catch (error) {
    console.error('[ApiKey] Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
