import { describe, expect, it, vi } from 'vitest';
import { DashboardAnalyticsService } from './dashboard';

describe('DashboardAnalyticsService', () => {
  it('queries equal current and previous UTC periods and returns deterministic facts', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new DashboardAnalyticsService({ workout: { findMany } } as never);

    await expect(service.overview({ from: '2026-07-20', to: '2026-07-26' })).resolves.toMatchObject(
      {
        period: { from: '2026-07-20', to: '2026-07-26' },
        previousPeriod: { from: '2026-07-13', to: '2026-07-19' },
        current: { totals: { volumeKg: 0 } },
        previous: { totals: { volumeKg: 0 } },
      },
    );
    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: {
        startedAt: {
          gte: new Date('2026-07-20T00:00:00.000Z'),
          lt: new Date('2026-07-27T00:00:00.000Z'),
        },
      },
      include: { exercises: { include: { sets: { orderBy: { ordinal: 'asc' } } } } },
      orderBy: { startedAt: 'asc' },
    });
  });

  it('rejects inverted and malformed periods before accessing the database', async () => {
    const findMany = vi.fn();
    const service = new DashboardAnalyticsService({ workout: { findMany } } as never);

    await expect(service.overview({ from: '2026-07-27', to: '2026-07-20' })).rejects.toThrow(
      'to must be on or after from',
    );
    await expect(service.overview({ from: '2026-07-20', to: '2026-02-30' })).rejects.toThrow(
      'to must be a valid calendar date',
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
