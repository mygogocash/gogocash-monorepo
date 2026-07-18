import { GUARDS_METADATA } from '@nestjs/common/constants';

import { ROLES_KEY } from 'src/admin/roles.decorator';
import { RolesGuard } from 'src/admin/roles.guard';

import { CategoryIntegrityReadinessGuard } from './category-integrity-readiness.guard';
import { PolicyController } from './policy.controller';

describe('PolicyController lifecycle contract', () => {
  const policy = { remove: jest.fn(), upsert: jest.fn() };
  const aggregate = {};
  const integrity = {
    deleteContent: jest.fn(),
    deleteContentLegacy: jest.fn(),
    retire: jest.fn(),
    purge: jest.fn(),
    withPolicyContentMutation: jest.fn(),
    withNormalWrite: jest.fn(),
  };
  const controller = new PolicyController(
    policy as never,
    aggregate as never,
    integrity as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('keeps legacy DELETE available before activation', async () => {
    integrity.withNormalWrite.mockImplementation(
      async ({ legacy }: { legacy: () => unknown }) => legacy(),
    );
    policy.remove.mockResolvedValue({ deleted: true });

    await expect(
      controller.remove('507f1f77bcf86cd799439011'),
    ).resolves.toEqual({ deleted: true });
    expect(policy.remove).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(integrity.deleteContentLegacy).not.toHaveBeenCalled();
  });

  it('routes legacy DELETE through content-only lifecycle after activation', async () => {
    integrity.withNormalWrite.mockImplementation(
      async ({ enforced }: { enforced: () => unknown }) => enforced(),
    );
    integrity.deleteContentLegacy.mockResolvedValue({
      operation: 'delete-content',
      policy_deleted: true,
    });
    await expect(
      controller.remove('507f1f77bcf86cd799439011'),
    ).resolves.toEqual({ deleted: true });
    expect(integrity.deleteContentLegacy).toHaveBeenCalledTimes(1);
    expect(policy.remove).not.toHaveBeenCalled();
  });

  it('keeps legacy PUT available before activation', async () => {
    const dto = {
      category_id: '507f1f77bcf86cd799439011',
      terms: { primary_locale: 'en', translations: { en: 'Terms' } },
    };
    integrity.withNormalWrite.mockImplementation(
      async ({ legacy }: { legacy: () => unknown }) => legacy(),
    );
    policy.upsert.mockResolvedValue({ saved: true });

    await expect(controller.upsert(dto)).resolves.toEqual({ saved: true });
    expect(policy.upsert).toHaveBeenCalledWith(dto);
    expect(integrity.withPolicyContentMutation).not.toHaveBeenCalled();
  });

  it('routes legacy PUT through the category revision transaction fence after activation', async () => {
    const dto = {
      category_id: '507f1f77bcf86cd799439011',
      terms: { primary_locale: 'en', translations: { en: 'Terms' } },
    };
    integrity.withNormalWrite.mockImplementation(
      async ({ enforced }: { enforced: () => unknown }) => enforced(),
    );
    integrity.withPolicyContentMutation.mockImplementation(
      async (_id: string, writer: (session: unknown) => unknown) =>
        writer('session'),
    );
    policy.upsert.mockResolvedValue({ saved: true });

    await expect(controller.upsert(dto)).resolves.toEqual({ saved: true });
    expect(integrity.withPolicyContentMutation).toHaveBeenCalledWith(
      dto.category_id,
      expect.any(Function),
    );
    expect(policy.upsert).toHaveBeenCalledWith(dto, 'session');
  });

  it('does not apply the new-endpoint readiness guard before legacy route dispatch', () => {
    for (const method of [
      PolicyController.prototype.upsert,
      PolicyController.prototype.remove,
    ]) {
      expect(Reflect.getMetadata(GUARDS_METADATA, method) ?? []).not.toEqual(
        expect.arrayContaining([CategoryIntegrityReadinessGuard]),
      );
    }
  });

  it('keeps retire support-gated', () => {
    const method = PolicyController.prototype.retire;
    expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual(['support']);
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual(
      expect.arrayContaining([RolesGuard, CategoryIntegrityReadinessGuard]),
    );
  });

  it('#377: gates policy content deletion at approver on both routes', () => {
    // Hard-deleting every locale's policy content is unrecoverable (no
    // revision history), so it matches the offer-delete tier (approver+):
    // the UI "Admin" role keeps it, UI "editor" (API support) does not.
    const deleteContent = PolicyController.prototype.deleteContent;
    expect(Reflect.getMetadata(ROLES_KEY, deleteContent)).toEqual(['approver']);
    expect(Reflect.getMetadata(GUARDS_METADATA, deleteContent)).toEqual(
      expect.arrayContaining([RolesGuard, CategoryIntegrityReadinessGuard]),
    );
    // The legacy DELETE compat route deletes the same content, so it moves
    // in lockstep.
    expect(
      Reflect.getMetadata(ROLES_KEY, PolicyController.prototype.remove),
    ).toEqual(['approver']);
  });

  it('makes purge superadmin-only and readiness-gated', () => {
    const method = PolicyController.prototype.purge;
    expect(Reflect.getMetadata(ROLES_KEY, method)).toEqual(['superadmin']);
    expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual(
      expect.arrayContaining([RolesGuard, CategoryIntegrityReadinessGuard]),
    );
  });
});
