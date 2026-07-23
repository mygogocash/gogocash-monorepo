import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuthAdminGuard } from '../jwt-auth-admin.guard';
import { DashboardController } from './dashboard.controller';

describe('DashboardController contract', () => {
  it('keeps the canonical dashboard namespace protected by AuthAdminGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toBe(
      'admin/dashboard',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, DashboardController)).toContain(
      AuthAdminGuard,
    );
  });

  it('passes the selected range to the insights service', async () => {
    const dashboardService = {
      getInsights: jest.fn().mockResolvedValue({ range: '30d' }),
    };
    const controller = new DashboardController(dashboardService as never);

    await expect(controller.getInsights({ range: '30d' })).resolves.toEqual({
      range: '30d',
    });
    expect(dashboardService.getInsights).toHaveBeenCalledWith('30d');
  });
});
