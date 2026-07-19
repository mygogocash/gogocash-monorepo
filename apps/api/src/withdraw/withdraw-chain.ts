import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isAddress } from 'ethers';
import { EVM_TRANSACTION_HASH_PATTERN } from './evm-transaction-hash';

export type WithdrawChainConfig = {
  chainId: number;
  contract: string;
  decimal: number;
  name: 'polygon' | 'bnb' | 'sonic' | 'celo';
  rpc: string;
};

export class ChainRecordRejectedError extends BadGatewayException {}
export class ChainRecordOutcomeUnknownError extends ServiceUnavailableException {}
export class PayoutEvidenceRejectedError extends BadGatewayException {}
export class PayoutEvidenceOutcomeUnknownError extends ServiceUnavailableException {}

export type ExactChainReceipt = {
  hash?: string;
  status?: number | bigint | null;
  to?: string | null;
};

type ExactChainReceiptProvider = {
  getNetwork(): Promise<{ chainId: number | bigint }>;
  getTransactionReceipt(hash: string): Promise<ExactChainReceipt | null>;
};

type WithdrawChainEnv = NodeJS.ProcessEnv;

const definitions = (env: WithdrawChainEnv) => [
  {
    chainId: Number(env.CHAIN_ID_WITHDRAW_POLYGON),
    contract: env.CONTRACT_WITHDRAW_ADDRESS_POLYGON,
    decimal: 6,
    name: 'polygon' as const,
    rpc: env.RPC_URL_POLYGON,
  },
  {
    chainId: Number(env.CHAIN_ID_WITHDRAW_BNB),
    contract: env.CONTRACT_WITHDRAW_ADDRESS_BNB,
    decimal: 18,
    name: 'bnb' as const,
    rpc: env.RPC_URL_BNB,
  },
  {
    chainId: Number(env.CHAIN_ID_WITHDRAW_SONIC),
    contract: env.CONTRACT_WITHDRAW_ADDRESS_SONIC,
    decimal: 6,
    name: 'sonic' as const,
    rpc: env.RPC_URL_SONIC,
  },
  {
    chainId: Number(env.CHAIN_ID_WITHDRAW_CELO),
    contract: env.CONTRACT_WITHDRAW_ADDRESS_CELO,
    decimal: 6,
    name: 'celo' as const,
    rpc: env.RPC_URL_CELO,
  },
];

export function configuredWithdrawChainIds(
  env: WithdrawChainEnv = process.env,
): number[] {
  return definitions(env)
    .map((entry) => entry.chainId)
    .filter(
      (chainId, index, values) =>
        Number.isSafeInteger(chainId) &&
        chainId > 0 &&
        values.indexOf(chainId) === index,
    );
}

export function resolveWithdrawChainConfig(
  chainId: number,
  env: WithdrawChainEnv = process.env,
): WithdrawChainConfig {
  const entry = definitions(env).find(
    (candidate) =>
      Number.isSafeInteger(candidate.chainId) && candidate.chainId === chainId,
  );
  if (!entry) {
    throw new BadRequestException('Unsupported withdrawal chain.');
  }
  if (!entry.rpc?.trim() || !entry.contract || !isAddress(entry.contract)) {
    throw new ServiceUnavailableException(
      `Withdrawal chain ${entry.name} is not configured.`,
    );
  }
  return {
    chainId: entry.chainId,
    contract: entry.contract,
    decimal: entry.decimal,
    name: entry.name,
    rpc: entry.rpc,
  };
}

export async function requireSuccessfulChainRecord(submission: {
  hash?: string;
  wait(): Promise<{ hash?: string; status?: number | bigint } | null>;
}): Promise<string> {
  let receipt: Awaited<ReturnType<typeof submission.wait>>;
  try {
    receipt = await submission.wait();
  } catch {
    throw new ChainRecordOutcomeUnknownError(
      'The chain-record transaction outcome could not be confirmed.',
    );
  }
  if (!receipt) {
    throw new ChainRecordOutcomeUnknownError(
      'The chain-record transaction outcome could not be confirmed.',
    );
  }
  if (Number(receipt.status) !== 1) {
    throw new ChainRecordRejectedError(
      'The chain-record transaction did not settle successfully.',
    );
  }
  const hash = String(receipt.hash || submission.hash || '').toLowerCase();
  if (!EVM_TRANSACTION_HASH_PATTERN.test(hash)) {
    throw new ChainRecordOutcomeUnknownError(
      'The chain-record transaction returned invalid evidence.',
    );
  }
  return hash;
}

/**
 * Reads payout evidence from the configured chain itself. A transaction hash
 * is not settlement proof until the RPC identifies the expected chain and
 * returns the matching successful receipt. When the payout contract is known,
 * the receipt must target that exact contract as well.
 */
export async function requireSuccessfulExactChainReceipt(input: {
  expectedChainId: number;
  expectedTarget?: string;
  provider: ExactChainReceiptProvider;
  transactionHash: string;
}): Promise<ExactChainReceipt> {
  const transactionHash = String(input.transactionHash).trim().toLowerCase();
  if (!EVM_TRANSACTION_HASH_PATTERN.test(transactionHash)) {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout transaction hash is invalid. The balance remains reserved for manual review.',
    );
  }

  let network: Awaited<ReturnType<ExactChainReceiptProvider['getNetwork']>>;
  try {
    network = await input.provider.getNetwork();
  } catch {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout chain could not be verified. The balance remains reserved for manual review.',
    );
  }
  const reportedChainId = Number(network.chainId);
  if (
    !Number.isSafeInteger(reportedChainId) ||
    reportedChainId !== input.expectedChainId
  ) {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout RPC did not report the expected chain. The balance remains reserved for manual review.',
    );
  }

  let receipt: ExactChainReceipt | null;
  try {
    receipt = await input.provider.getTransactionReceipt(transactionHash);
  } catch {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout receipt could not be verified. The balance remains reserved for manual review.',
    );
  }
  if (!receipt) {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout transaction has no mined receipt yet. The balance remains reserved for manual review.',
    );
  }

  const receiptHash = String(receipt.hash ?? '').toLowerCase();
  if (
    !EVM_TRANSACTION_HASH_PATTERN.test(receiptHash) ||
    receiptHash !== transactionHash
  ) {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout receipt did not match the submitted transaction. The balance remains reserved for manual review.',
    );
  }
  if (receipt.status === 0 || receipt.status === 0n) {
    throw new PayoutEvidenceRejectedError(
      'The payout transaction failed on-chain. The withdrawal remains pending for manual review.',
    );
  }
  if (Number(receipt.status) !== 1) {
    throw new PayoutEvidenceOutcomeUnknownError(
      'The payout receipt returned an unknown status. The balance remains reserved for manual review.',
    );
  }

  if (input.expectedTarget) {
    // ethers.isAddress rejects a leading "0X"; normalize before validation.
    const expectedTarget = String(input.expectedTarget).trim().toLowerCase();
    const receiptTarget = String(receipt.to ?? '')
      .trim()
      .toLowerCase();
    if (
      !isAddress(expectedTarget) ||
      !receiptTarget ||
      !isAddress(receiptTarget) ||
      receiptTarget !== expectedTarget
    ) {
      throw new PayoutEvidenceRejectedError(
        'The payout transaction did not target the expected withdrawal contract. The withdrawal remains pending for manual review.',
      );
    }
  }

  return receipt;
}
