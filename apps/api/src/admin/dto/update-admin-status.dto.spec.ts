import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAdminDto, UpdateRequestWithdrawDto } from './update-admin.dto';

describe('admin mutation DTO allowlists', () => {
  it('accepts a supported withdrawal status', async () => {
    const dto = plainToInstance(UpdateRequestWithdrawDto, {
      id: '507f1f77bcf86cd799439011',
      status: 'rejected',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an arbitrary withdrawal status', async () => {
    const dto = plainToInstance(UpdateRequestWithdrawDto, {
      id: '507f1f77bcf86cd799439011',
      status: 'processing',
    });

    const errors = await validate(dto);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'status',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });

  it('rejects an arbitrary admin role', async () => {
    const dto = plainToInstance(UpdateAdminDto, { role: 'owner' });

    const errors = await validate(dto);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'role',
          constraints: expect.objectContaining({ isIn: expect.any(String) }),
        }),
      ]),
    );
  });
});
