import algosdk from 'algosdk';
import { NextFunction, Request, Response } from 'express';

type IndexerTxn = {
  id?: string;
  group?: string;
  sender?: string;
  logs?: string[];
  ['confirmed-round']?: number;
  ['tx-type']?: string;
  ['application-transaction']?: {
    ['application-id']?: number;
  };
  ['payment-transaction']?: {
    receiver?: string;
    amount?: number;
  };
};

export type VerifiedIgnitionPayment = {
  txId: string;
  groupId: string;
  payer: string;
  amountMicroAlgos: number;
  confirmedRound: number;
};

export type L402VerifiedRequest = Request & {
  ignitionPayment?: VerifiedIgnitionPayment;
};

// In-memory replay protection. This satisfies the task requirement for a mock/simple DB check.
// Replace this with Redis/Mongo in production so replays are blocked across process restarts.
const usedTxIds = new Set<string>();

const BASE_MODEL_PRICE_MICROALGOS = 100_000;
const BASE_MODEL_PRICE_ALGO = 0.1;

const INDEXER_URL = process.env.ALGORAND_INDEXER_URL || 'https://testnet-idx.algonode.cloud';
const IGNITION_GATEWAY_APP_ID = Number(process.env.IGNITION_GATEWAY_APP_ID || '0');
const IGNITION_TREASURY_ADDRESS = process.env.IGNITION_TREASURY_ADDRESS || '';

const indexer = new algosdk.Indexer('', INDEXER_URL, '');

const getBearerToken = (headerValue?: string): string | null => {
  if (!headerValue) return null;
  if (!headerValue.startsWith('Bearer ')) return null;
  const token = headerValue.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

const decodeBase64Log = (b64: string): string => {
  try {
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

const respondPaymentRequired = (res: Response): void => {
  res.status(402).json({
    status: 402,
    requiredAmountAlgo: BASE_MODEL_PRICE_ALGO,
    message: 'Payment required via IgnitionGateway Smart Contract',
  });
};

// L402 verification middleware.
//
// What this middleware guarantees before your AI route executes:
// 1) A txId exists in Authorization: Bearer <txId>.
// 2) The txId is confirmed on Algorand Testnet.
// 3) The transaction is an app call to your IgnitionGateway app ID.
// 4) The same atomic group contains a payment >= 0.1 ALGO to your treasury.
// 5) The txId has not been used before (simple replay / double-spend defense).
export const verifyIgnitionL402Payment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // The L402 intercept: missing bearer token means client has not paid yet.
  const txId = getBearerToken(req.headers.authorization);
  if (!txId) {
    respondPaymentRequired(res);
    return;
  }

  // Validate required server-side configuration.
  if (!IGNITION_GATEWAY_APP_ID || !IGNITION_TREASURY_ADDRESS) {
    res.status(500).json({
      error: 'Server misconfigured. Set IGNITION_GATEWAY_APP_ID and IGNITION_TREASURY_ADDRESS.',
    });
    return;
  }

  // Replay protection: a proof can only be consumed once by this backend process.
  if (usedTxIds.has(txId)) {
    res.status(409).json({ error: 'txId already used' });
    return;
  }

  let appCallTxn: IndexerTxn;

  try {
    // Fetch the exact transaction by ID from Testnet Indexer.
    // If this fails, txId is invalid/unreachable and must be rejected.
    const lookup = await indexer.lookupTransactionByID(txId).do();
    appCallTxn = lookup.transaction as IndexerTxn;
  } catch (error) {
    res.status(401).json({ error: 'Invalid txId or indexer lookup failed' });
    return;
  }

  // 1) Transaction must be confirmed. Failed app calls never become confirmed transactions.
  const confirmedRound = Number(appCallTxn['confirmed-round'] || 0);
  if (confirmedRound <= 0) {
    res.status(401).json({ error: 'Transaction is not confirmed' });
    return;
  }

  // 2) Must be an application call to your payment-verifier contract.
  if (appCallTxn['tx-type'] !== 'appl') {
    res.status(401).json({ error: 'txId must reference an application call transaction' });
    return;
  }

  const appId = Number(appCallTxn['application-transaction']?.['application-id'] || 0);
  if (appId !== IGNITION_GATEWAY_APP_ID) {
    res.status(401).json({ error: 'Application ID mismatch for IgnitionGateway' });
    return;
  }

  // Optional but strong signal: your contract logs PAID_BASE_MODEL on successful verification.
  const logs = appCallTxn.logs || [];
  const containsSuccessLog = logs.some((entry) => decodeBase64Log(entry) === 'PAID_BASE_MODEL');
  if (!containsSuccessLog) {
    res.status(401).json({ error: 'Missing expected IgnitionGateway success log' });
    return;
  }

  // 3) Payment guarantee comes from atomic group inspection:
  //    We locate every tx in the same group, then find at least one payment tx
  //    that pays treasury >= required base model price.
  const groupId = appCallTxn.group;
  if (!groupId) {
    res.status(401).json({ error: 'Expected grouped transaction but group ID is missing' });
    return;
  }

  let groupTxns: IndexerTxn[] = [];
  try {
    const groupLookup = await indexer.searchForTransactions().groupid(groupId).do();
    groupTxns = (groupLookup.transactions || []) as IndexerTxn[];
  } catch {
    res.status(401).json({ error: 'Failed to load grouped transactions for verification' });
    return;
  }

  const qualifyingPayment = groupTxns.find((txn) => {
    if (txn['tx-type'] !== 'pay') return false;
    if (Number(txn['confirmed-round'] || 0) <= 0) return false;
    const receiver = txn['payment-transaction']?.receiver;
    const amount = Number(txn['payment-transaction']?.amount || 0);
    return receiver === IGNITION_TREASURY_ADDRESS && amount >= BASE_MODEL_PRICE_MICROALGOS;
  });

  if (!qualifyingPayment) {
    res.status(401).json({
      error: 'No qualifying treasury payment found in transaction group',
    });
    return;
  }

  // Finalize replay protection only after full on-chain verification succeeds.
  usedTxIds.add(txId);

  (req as L402VerifiedRequest).ignitionPayment = {
    txId,
    groupId,
    payer: qualifyingPayment.sender || 'unknown',
    amountMicroAlgos: Number(qualifyingPayment['payment-transaction']?.amount || 0),
    confirmedRound,
  };

  next();
};
