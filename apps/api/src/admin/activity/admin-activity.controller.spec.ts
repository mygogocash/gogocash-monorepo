import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../roles.decorator';
import { AdminActivityController } from './admin-activity.controller';
import { ListAdminActivityQueryDto } from './dto/list-admin-activity-query.dto';

describe('AdminActivityController contract', () => {
  it('allows the read-only viewer role to list activity', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminActivityController.prototype.list,
    ) as string[] | undefined;

    expect(roles).toContain('viewer');
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ page: '1.5' }, 'page'],
    [{ limit: '101' }, 'limit'],
    [{ from: 'not-a-date' }, 'from'],
    [{ search: 'x'.repeat(101) }, 'search'],
    [{ actor_id: 'x'.repeat(201) }, 'actor_id'],
  ])('rejects an unsafe query %p', async (input, property) => {
    const dto = plainToInstance(ListAdminActivityQueryDto, input);
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain(property);
  });

  it('transforms bounded pagination values', async () => {
    const dto = plainToInstance(ListAdminActivityQueryDto, {
      page: '2',
      limit: '50',
      search: 'coupon',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto).toMatchObject({ page: 2, limit: 50, search: 'coupon' });
  });
});
