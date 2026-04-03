import { GoogleGenerativeAI } from '@google/generative-ai';
import { Router, Response } from 'express';
import { L402VerifiedRequest, verifyIgnitionL402Payment } from '../middleware/verifyIgnitionL402Payment';

type BaseModelsGenerateBody = {
  prompt?: string;
  model?: string;
};

const router = Router();

router.post('/generate', verifyIgnitionL402Payment, async (req: L402VerifiedRequest, res: Response): Promise<void> => {
  const { prompt, model } = req.body as BaseModelsGenerateBody;

  if (!prompt || !model) {
    res.status(400).json({ error: 'Body must include prompt and model' });
    return;
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    // Stream plain text chunks so frontend receives token-by-token output.
    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Ignition-Payment-TxId', req.ignitionPayment?.txId || '');

    const streamResult = await geminiModel.generateContentStream(prompt);
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        res.write(text);
      }
    }

    res.end();
  } catch (error) {
    console.error('[BaseModels] Gemini streaming failed:', error);

    if (!res.headersSent) {
      res.status(502).json({ error: 'AI provider request failed' });
      return;
    }

    // If headers already streamed, close the stream cleanly.
    res.end();
  }
});

export default router;
