import algosdk from 'algosdk';
import { NextFunction, Request, Response } from 'express';

type IndexerTxn = {
  id?: string;
  group?: string | Uint8Array;
  sender?: string;
  logs?: Array<string | Uint8Array>;
  confirmedRound?: number;
  ['confirmed-round']?: number;
  txType?: string;
  ['tx-type']?: string;
  applicationTransaction?: {
    applicationId?: number;
  };
  ['application-transaction']?: {
    ['application-id']?: number;
  };
  paymentTransaction?: {
    receiver?: string;
    amount?: number;
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
  finalizeIgnitionPayment?: (consumed: boolean) => void;
};

// In-memory replay protection. This satisfies the task requirement for a mock/simple DB check.
// Replace this with Redis/Mongo in production so replays are blocked across process restarts.
const usedTxIds = new Set<string>();
const inFlightTxIds = new Set<string>();

const BASE_MODEL_PRICE_MICROALGOS = 100_000;
const BASE_MODEL_PRICE_ALGO = 0.1;

const DEFAULT_INDEXER_URL = 'https://testnet-idx.algonode.cloud';

const getRuntimeConfig = () => {
  const indexerUrl = (process.env.ALGORAND_INDEXER_URL || DEFAULT_INDEXER_URL).trim();
  const gatewayAppId = Number(process.env.IGNITION_GATEWAY_APP_ID || '0');
  const treasuryAddress = (process.env.IGNITION_TREASURY_ADDRESS || '').trim();

  return {
    indexerUrl,
    gatewayAppId,
    treasuryAddress,
  };
};

const getBearerToken = (headerValue?: string): string | null => {
  if (!headerValue) return null;
  if (!headerValue.startsWith('Bearer ')) return null;
  const token = headerValue.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

const decodeLogEntry = (entry: string | Uint8Array): string => {
  if (entry instanceof Uint8Array) {
    return Buffer.from(entry).toString('utf-8');
  }

  try {
    return Buffer.from(entry, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

const getConfirmedRound = (txn: IndexerTxn): number => {
  return Number(txn.confirmedRound ?? txn['confirmed-round'] ?? 0);
};

const getTxType = (txn: IndexerTxn): string => {
  return String(txn.txType ?? txn['tx-type'] ?? '');
};

const getApplicationId = (txn: IndexerTxn): number => {
  return Number(txn.applicationTransaction?.applicationId ?? txn['application-transaction']?.['application-id'] ?? 0);
};

const getPaymentReceiver = (txn: IndexerTxn): string => {
  return String(txn.paymentTransaction?.receiver ?? txn['payment-transaction']?.receiver ?? '');
};

const getPaymentAmount = (txn: IndexerTxn): number => {
  return Number(txn.paymentTransaction?.amount ?? txn['payment-transaction']?.amount ?? 0);
};

const normalizeGroupId = (group: IndexerTxn['group']): string => {
  if (!group) return '';
  if (typeof group === 'string') return group;
  return Buffer.from(group).toString('base64');
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(operation: () => Promise<T>, attempts = 6, delayMs = 800): Promise<T> => {
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
};

const respondPaymentRequired = (res: Response): void => {
  res.status(402).json({
    status: 402,
    requiredAmountAlgo: BASE_MODEL_PRICE_ALGO,
    message: 'Payment required via IgnitionGateway Smart Contract',
  });
};

const respondUnauthorized = (res: Response, txId: string, reason: string): void => {
  console.warn(`[L402] Reject txId=${txId}: ${reason}`);
  res.status(401).json({ error: reason });
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
  const { indexerUrl, gatewayAppId, treasuryAddress } = getRuntimeConfig();
  const indexer = new algosdk.Indexer('', indexerUrl, '');

  // The L402 intercept: missing bearer token means client has not paid yet.
  const txId = getBearerToken(req.headers.authorization);
  if (!txId) {
    respondPaymentRequired(res);
    return;
  }

  // Validate required server-side configuration.
  if (!gatewayAppId || !treasuryAddress) {
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

  // Prevent concurrent re-use while a verified request is being processed.
  if (inFlightTxIds.has(txId)) {
    res.status(409).json({ error: 'txId is currently being processed' });
    return;
  }

  let appCallTxn: IndexerTxn;
  let confirmedRound = 0;

  try {
    // Indexer can lag right after confirmation, so allow a short retry window.
    const lookup = await withRetry(
      async () => {
        const result = await indexer.lookupTransactionByID(txId).do();
        const txn = result?.transaction as IndexerTxn | undefined;
        if (!txn) {
          throw new Error('Transaction not indexed yet');
        }
        const round = getConfirmedRound(txn);
        if (round <= 0) {
          throw new Error('Transaction not confirmed in indexer yet');
        }
        return result;
      },
      12,
      1000,
    );
    appCallTxn = lookup.transaction as IndexerTxn;
    confirmedRound = getConfirmedRound(appCallTxn);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Invalid txId or indexer lookup failed';
    if (reason.includes('not confirmed')) {
      respondUnauthorized(res, txId, 'Transaction is not confirmed');
      return;
    }

    respondUnauthorized(res, txId, 'Invalid txId or indexer lookup failed');
    return;
  }

  // 1) Transaction must be confirmed. Failed app calls never become confirmed transactions.
  if (confirmedRound <= 0) {
    respondUnauthorized(res, txId, 'Transaction is not confirmed');
    return;
  }

  // 2) Must be an application call to your payment-verifier contract.
  if (getTxType(appCallTxn) !== 'appl') {
    respondUnauthorized(res, txId, 'txId must reference an application call transaction');
    return;
  }

  const appId = getApplicationId(appCallTxn);
  if (appId !== gatewayAppId) {
    respondUnauthorized(res, txId, 'Application ID mismatch for IgnitionGateway');
    return;
  }

  // Optional but strong signal: your contract logs PAID_BASE_MODEL on successful verification.
  const logs = appCallTxn.logs || [];
  const containsSuccessLog = logs.some((entry) => decodeLogEntry(entry).includes('PAID_BASE_MODEL'));
  if (!containsSuccessLog) {
    console.warn(`[L402] txId=${txId}: Missing expected IgnitionGateway success log (continuing)`);
  }

  // 3) Payment guarantee comes from atomic group inspection:
  //    We locate every tx in the same group, then find at least one payment tx
  //    that pays treasury >= required base model price.
  const groupId = normalizeGroupId(appCallTxn.group);
  if (!groupId) {
    respondUnauthorized(res, txId, 'Expected grouped transaction but group ID is missing');
    return;
  }

  let groupTxns: IndexerTxn[] = [];
  try {
    const groupLookup = await withRetry(
      async () => {
        const result = await indexer.searchForTransactions().groupid(groupId).do();
        const txns = (result.transactions || []) as IndexerTxn[];
        if (txns.length === 0) {
          throw new Error('Grouped transactions not indexed yet');
        }
        return result;
      },
      6,
      900,
    );
    groupTxns = (groupLookup.transactions || []) as IndexerTxn[];
  } catch {
    respondUnauthorized(res, txId, 'Failed to load grouped transactions for verification');
    return;
  }

  const qualifyingPayment = groupTxns.find((txn) => {
    if (getTxType(txn) !== 'pay') return false;
    if (getConfirmedRound(txn) <= 0) return false;
    const receiver = getPaymentReceiver(txn);
    const amount = getPaymentAmount(txn);
    return receiver === treasuryAddress && amount >= BASE_MODEL_PRICE_MICROALGOS;
  });

  if (!qualifyingPayment) {
    respondUnauthorized(res, txId, 'No qualifying treasury payment found in transaction group');
    return;
  }

  // Lock txId while downstream route executes; consume only on successful completion.
  inFlightTxIds.add(txId);

  const verifiedRequest = req as L402VerifiedRequest;

  verifiedRequest.ignitionPayment = {
    txId,
    groupId,
    payer: qualifyingPayment.sender || 'unknown',
    amountMicroAlgos: getPaymentAmount(qualifyingPayment),
    confirmedRound,
  };

  verifiedRequest.finalizeIgnitionPayment = (consumed: boolean) => {
    inFlightTxIds.delete(txId);
    if (consumed) {
      usedTxIds.add(txId);
    }
  };

  next();
};
