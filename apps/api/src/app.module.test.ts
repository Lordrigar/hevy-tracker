import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './app.module';

describe('HealthController', () => {
  it('reports the API and database as healthy', async () => {
    const prisma = { healthCheck: vi.fn().mockResolvedValue('connected') };
    const controller = new HealthController(prisma as never);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      service: 'hevy-tracker-api',
      database: 'connected',
    });
    expect(prisma.healthCheck).toHaveBeenCalledOnce();
  });
});
