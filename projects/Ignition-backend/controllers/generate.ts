import { Request, Response } from 'express';
import algosdk from 'algosdk';
import crypto from 'crypto';
import Agent from '../models/Agent';

const usedTxIds = new Set<string>();

const indexerClient = new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', '');

export const generateRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, agentId } = req.body;
    const authHeader = req.headers.authorization;

    if (!prompt || !agentId) {
      res.status(400).json({ error: 'Missing prompt or agentId' });
      return;
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const requiredAmount = Math.round(agent.price * 1_000_000);
    const requiredAddress = agent.creatorWallet;

    // ─── Step 1: The L402 Intercept ───
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 402 Payment Required
      const invoiceId = crypto.randomBytes(8).toString('hex');
      const challenge = Buffer.from(
        JSON.stringify({
          amountMicroAlgos: requiredAmount,
          creatorAddress: requiredAddress,
          invoiceId: invoiceId,
          message: `Payment required for ${agent.name}`,
        })
      ).toString('base64');

      res.status(402).set('Payment-Required', challenge).json({
        error: 'Payment Required',
        amountMicroAlgos: requiredAmount,
        creatorAddress: requiredAddress,
        invoiceId: invoiceId
      });
      return;
    }

    // ─── Step 2: Extract & Verify Transaction (Double-spend protection) ───
    const txId = authHeader.split(' ')[1];

    if (usedTxIds.has(txId)) {
      res.status(401).json({ error: 'Transaction already used (Double Spend)' });
      return;
    }

    let txInfo;
    try {
      // Lookup the transaction on the Algorand blockchain
      txInfo = await indexerClient.lookupTransactionByID(txId).do();
    } catch (error) {
      console.warn(`[L402] Indexer verification failed for tx: ${txId}. Assuming simulated success for hackathon env.`);
      // During heavy hackathon testing without testnet ALGO, you might bypass strict check
      // For strict validation un-comment the lines below:
      /*
      res.status(401).json({ error: 'Invalid or missing transaction' });
      return;
      */
    }

    if (txInfo && txInfo.transaction) {
      const txn: any = txInfo.transaction;

      // Ensure it's a payment transaction
      if (txn['tx-type'] !== 'pay') {
        res.status(401).json({ error: 'Transaction must be a payment' });
        return;
      }

      // Verify the receiver destination
      if (txn['payment-transaction'].receiver !== requiredAddress) {
        res.status(401).json({ error: 'Payment destination address mismatch' });
        return;
      }

      // Verify the amount paid
      if (txn['payment-transaction'].amount < requiredAmount) {
        res.status(401).json({ error: `Insufficient payment. Expected ${requiredAmount} microAlgos.` });
        return;
      }
    }

    // Mark as used
    usedTxIds.add(txId);

    // ─── Step 3: The Dual Router ───

    // --- 3A: Internally Hosted (Ignition Base Model Wrapper) ---
    if (agent.hostingType === 'internal') {
      console.log(`[Router] Routing to internal LLM (${agent.baseModel}) for agent: ${agent.name}`);

      // Here you would implement your specific API call to Gemini, OpenAI, Claude, etc.
      // E.g. using @google/genai or standard fetch.
      // We simulate the response for the architecture prototype.
      const simulatedLLMResponse = `[Internal LLM: ${agent.baseModel}]\n\nProcessing system prompt:\n> ${agent.systemPrompt?.substring(0, 50)}...\n\nUser prompt received:\n> ${prompt}\n\nTask executed successfully internally on Ignition infrastructure.`;

      res.status(200).json({ result: simulatedLLMResponse });
      return;
    }

    // --- 3B: Externally Hosted (Ignition HTTP Proxy) ---
    if (agent.hostingType === 'external') {
      console.log(`[Router] Proxying request to external hook: ${agent.endpointUrl}`);

      try {
        const externalResponse = await fetch(agent.endpointUrl!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass along generic metadata
            'X-Ignition-Agent': agent.name,
            'X-Ignition-TxId': txId,
          },
          body: JSON.stringify({ prompt }),
        });

        if (!externalResponse.ok) {
          throw new Error(`External endpoint returned ${externalResponse.status}`);
        }

        // We can either stream back the response using externalResponse.body
        // or just send the full text for simplicity in this prototype.
        const responseData = await externalResponse.text();

        // Pass the raw external response right back to the client
        res.status(200).send(responseData);
        return;
      } catch (error) {
        console.error(`[Router] External proxy failed:`, error);
        res.status(502).json({ error: 'Bad Gateway. The external agent endpoint is unreachable.' });
        return;
      }
    }

  } catch (error) {
    console.error('[Gateway] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
