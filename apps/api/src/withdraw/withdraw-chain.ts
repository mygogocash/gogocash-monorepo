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
