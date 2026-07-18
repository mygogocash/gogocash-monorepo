import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ChainRecordOutcomeUnknownError,
  ChainRecordRejectedError,
  PayoutEvidenceOutcomeUnknownError,
  PayoutEvidenceRejectedError,
  configuredWithdrawChainIds,
  requireSuccessfulExactChainReceipt,
  requireSuccessfulChainRecord,
  resolveWithdrawChainConfig,
} from './withdraw-chain';

const ADDRESS = `0x${'a'.repeat(40)}`;
const HASH = `0x${'b'.repeat(64)}`;
const env = {
  CHAIN_ID_WITHDRAW_POLYGON: '137',
  CONTRACT_WITHDRAW_ADDRESS_POLYGON: ADDRESS,
  RPC_URL_POLYGON: 'https://polygon.invalid',
  CHAIN_ID_WITHDRAW_BNB: '56',
  CONTRACT_WITHDRAW_ADDRESS_BNB: ADDRESS,
  RPC_URL_BNB: 'https://bnb.invalid',
  CHAIN_ID_WITHDRAW_SONIC: '146',
  CONTRACT_WITHDRAW_ADDRESS_SONIC: ADDRESS,
  RPC_URL_SONIC: 'https://sonic.invalid',
  CHAIN_ID_WITHDRAW_CELO: '42220',
  CONTRACT_WITHDRAW_ADDRESS_CELO: ADDRESS,
  RPC_URL_CELO: 'https://celo.invalid',
} as NodeJS.ProcessEnv;

describe('withdraw chain boundary', () => {
  it('routes Celo explicitly and lists each supported chain once', () => {
    expect(resolveWithdrawChainConfig(42220, env)).toMatchObject({
      chainId: 42220,
      name: 'celo',
      rpc: 'https://celo.invalid',
    });
    expect(configuredWithdrawChainIds(env)).toEqual([137, 56, 146, 42220]);
  });

  it('rejects unknown and incompletely configured chains', () => {
    expect(() => resolveWithdrawChainConfig(1, env)).toThrow(
      BadRequestException,
    );
    expect(() =>
      resolveWithdrawChainConfig(42220, { ...env, RPC_URL_CELO: '' }),
    ).toThrow(ServiceUnavailableException);
  });

  it('accepts only a mined successful receipt as evidence', async () => {
    await expect(
      requireSuccessfulChainRecord({
        hash: HASH,
        wait: async () => ({ hash: HASH.toUpperCase(), status: 1 }),
      }),
    ).resolves.toBe(HASH);

    await expect(
      requireSuccessfulChainRecord({ hash: HASH, wait: async () => null }),
    ).rejects.toBeInstanceOf(ChainRecordOutcomeUnknownError);
    await expect(
      requireSuccessfulChainRecord({
        hash: HASH,
        wait: async () => ({ hash: HASH, status: 0 }),
      }),
    ).rejects.toBeInstanceOf(ChainRecordRejectedError);
    await expect(
      requireSuccessfulChainRecord({
        hash: HASH,
        wait: async () => {
          throw new Error('rpc disconnected');
        },
      }),
    ).rejects.toBeInstanceOf(ChainRecordOutcomeUnknownError);
  });

  it('accepts payout evidence only from a successful receipt on the exact configured chain and target', async () => {
    await expect(
      requireSuccessfulExactChainReceipt({
        expectedChainId: 137,
        expectedTarget: ADDRESS,
        provider: {
          getNetwork: async () => ({ chainId: 137n }),
          getTransactionReceipt: async () => ({
            hash: HASH.toUpperCase(),
            status: 1,
            to: ADDRESS.toUpperCase(),
          }),
        },
        transactionHash: HASH,
      }),
    ).resolves.toMatchObject({ hash: HASH.toUpperCase(), status: 1 });
  });

  it.each([
    [
      'wrong chain',
      {
        getNetwork: async () => ({ chainId: 56n }),
        getTransactionReceipt: async () => ({
          hash: HASH,
          status: 1,
          to: ADDRESS,
        }),
      },
      PayoutEvidenceOutcomeUnknownError,
    ],
    [
      'missing receipt',
      {
        getNetwork: async () => ({ chainId: 137n }),
        getTransactionReceipt: async () => null,
      },
      PayoutEvidenceOutcomeUnknownError,
    ],
    [
      'failed receipt',
      {
        getNetwork: async () => ({ chainId: 137n }),
        getTransactionReceipt: async () => ({
          hash: HASH,
          status: 0,
          to: ADDRESS,
        }),
      },
      PayoutEvidenceRejectedError,
    ],
    [
      'wrong contract target',
      {
        getNetwork: async () => ({ chainId: 137n }),
        getTransactionReceipt: async () => ({
          hash: HASH,
          status: 1,
          to: `0x${'c'.repeat(40)}`,
        }),
      },
      PayoutEvidenceRejectedError,
    ],
  ])('rejects %s payout evidence', async (_case, provider, ErrorType) => {
    await expect(
      requireSuccessfulExactChainReceipt({
        expectedChainId: 137,
        expectedTarget: ADDRESS,
        provider,
        transactionHash: HASH,
      }),
    ).rejects.toBeInstanceOf(ErrorType);
  });
});
