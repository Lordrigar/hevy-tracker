import { describe, expect, it, vi } from 'vitest';
import { DashboardAnalyticsService } from './dashboard';

describe('DashboardAnalyticsService', () => {
  it('queries equal current and previous UTC periods and returns deterministic facts', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new DashboardAnalyticsService({
      workout: { findMany },
      hevyExerciseTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      hevyBodyMeasurement: { findMany: vi.fn().mockResolvedValue([]) },
    } as never);

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
    const service = new DashboardAnalyticsService({
      workout: { findMany },
      hevyExerciseTemplate: { findMany: vi.fn() },
      hevyBodyMeasurement: { findMany: vi.fn() },
    } as never);

    await expect(service.overview({ from: '2026-07-27', to: '2026-07-20' })).rejects.toThrow(
      'to must be on or after from',
    );
    await expect(service.overview({ from: '2026-07-20', to: '2026-02-30' })).rejects.toThrow(
      'to must be a valid calendar date',
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('uses the latest same-day or earlier imported weight, never a later one', async () => {
    const workoutFindMany = vi.fn().mockResolvedValue([
      {
        id: 'pullups',
        title: 'Pull ups',
        startedAt: new Date('2026-07-20T18:00:00.000Z'),
        exercises: [
          {
            id: 'pullups-exercise',
            templateId: 'pullups-template',
            name: 'Pull Up',
            muscleGroup: 'lats',
            sets: [{ weightKg: 2.5, reps: 10, rpe: null, ordinal: 0 }],
          },
        ],
      },
    ]);
    const service = new DashboardAnalyticsService({
      workout: { findMany: workoutFindMany },
      hevyExerciseTemplate: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'pullups-template', type: 'bodyweight_weighted' }]),
      },
      hevyBodyMeasurement: {
        findMany: vi.fn().mockResolvedValue([
          { date: new Date('2026-07-19T00:00:00.000Z'), weightKg: 80 },
          { date: new Date('2026-07-20T00:00:00.000Z'), weightKg: 75 },
          { date: new Date('2026-07-21T00:00:00.000Z'), weightKg: 70 },
        ]),
      },
    } as never);

    const result = await service.exerciseTrend({
      from: '2026-07-20',
      to: '2026-07-20',
      exercise: 'Pull Up',
    });

    expect(result.trend[0]).toMatchObject({
      maxLoadKg: 77.5,
      volumeKg: 775,
      bodyweightCoverage: { setsWithBodyWeight: 1, effectiveVolumeKg: 775 },
    });
  });

  it('returns imported measurement history only in the requested inclusive range', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new DashboardAnalyticsService({ hevyBodyMeasurement: { findMany } } as never);

    await expect(
      service.measurementHistory({ from: '2026-07-20', to: '2026-07-26' }),
    ).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2026-07-20T00:00:00.000Z'),
          lt: new Date('2026-07-27T00:00:00.000Z'),
        },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        weightKg: true,
        bodyFatPercentage: true,
        chestCm: true,
        waistCm: true,
        hipsCm: true,
        bicepCm: true,
      },
    });
  });

  it('upserts a seven-day report with boundary-safe comparisons and deterministic deltas', async () => {
    const currentStart = new Date('2026-07-20T00:00:00.000Z');
    const workoutFindMany = vi.fn(({ where }) =>
      Promise.resolve(
        where.startedAt.gte.getTime() === currentStart.getTime()
          ? [
              {
                id: 'current-bench',
                title: 'Current bench',
                startedAt: new Date('2026-07-26T18:00:00.000Z'),
                exercises: [
                  {
                    id: 'current-bench-exercise',
                    templateId: 'bench',
                    name: 'Bench Press',
                    muscleGroup: 'chest',
                    sets: [{ weightKg: 80, reps: 5, rpe: 8, ordinal: 0, isWarmup: false }],
                  },
                ],
              },
            ]
          : [
              {
                id: 'previous-bench',
                title: 'Previous bench',
                startedAt: new Date('2026-07-13T18:00:00.000Z'),
                exercises: [
                  {
                    id: 'previous-bench-exercise',
                    templateId: 'bench',
                    name: 'Bench Press',
                    muscleGroup: 'chest',
                    sets: [{ weightKg: 70, reps: 5, rpe: 8, ordinal: 0, isWarmup: false }],
                  },
                ],
              },
            ],
      ),
    );
    const upsert = vi.fn().mockResolvedValue({});
    const service = new DashboardAnalyticsService({
      workout: { findMany: workoutFindMany },
      hevyExerciseTemplate: { findMany: vi.fn().mockResolvedValue([]) },
      hevyBodyMeasurement: { findMany: vi.fn().mockResolvedValue([]) },
      weeklyReport: { upsert },
    } as never);

    const report = await service.generateWeeklyReport({ weekStart: '2026-07-20' });

    expect(report).toMatchObject({
      weekStart: '2026-07-20',
      weekEnd: '2026-07-26',
      totals: { workoutCount: 1, setCount: 1, repCount: 5, volumeKg: 400 },
      changes: { workoutCount: 0, setCount: 0, repCount: 0, volumeKg: 50 },
      prs: [{ exerciseKey: 'bench', maxLoadKg: 80, achievedOn: ['2026-07-26'] }],
      strengthChanges: [
        { exerciseKey: 'bench', currentMaxLoadKg: 80, previousMaxLoadKg: 70, changeKg: 10 },
      ],
      muscleGroupVolumeDeltas: [
        { muscleGroup: 'chest', currentVolumeKg: 400, previousVolumeKg: 350, changeKg: 50 },
      ],
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { weekStart: new Date('2026-07-20T00:00:00.000Z') },
      create: expect.objectContaining({ weekStart: new Date('2026-07-20T00:00:00.000Z') }),
      update: expect.objectContaining({
        report: expect.objectContaining({ weekEnd: '2026-07-26' }),
      }),
    });
  });
});
