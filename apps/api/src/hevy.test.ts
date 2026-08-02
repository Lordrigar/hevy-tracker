import { describe, expect, it, vi } from 'vitest';
import bodyMeasurementsPage from './fixtures/hevy-body-measurements-page.json';
import templatesPage from './fixtures/hevy-templates-page.json';
import workoutEventsPage from './fixtures/hevy-workout-events-page.json';
import workoutsPage from './fixtures/hevy-workouts-page.json';
import {
  HevyApiError,
  HevyClient,
  HevySyncService,
  type HevyExerciseTemplate,
  type HevyWorkout,
} from './hevy';

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

describe('HevyClient', () => {
  it('requests every paginated workout page with the API key header', async () => {
    process.env.HEVY_API_KEY = 'sanitized-test-key';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ ...workoutsPage, page: 1, page_count: 2 }))
      .mockResolvedValueOnce(response({ ...workoutsPage, page: 2, page_count: 2, workouts: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new HevyClient();
    await expect(client.listWorkouts()).resolves.toHaveLength(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0].toString()).toContain('page=1&pageSize=10');
    expect(fetchMock.mock.calls[1][0].toString()).toContain('page=2&pageSize=10');
    expect(fetchMock.mock.calls[0][1]).toEqual({
      method: 'GET',
      headers: { 'api-key': 'sanitized-test-key' },
    });
    vi.unstubAllGlobals();
    delete process.env.HEVY_API_KEY;
  });

  it('reports an actionable error when no local API key is configured', async () => {
    delete process.env.HEVY_API_KEY;
    const client = new HevyClient();
    await expect(client.listWorkouts()).rejects.toEqual(expect.any(HevyApiError));
    await expect(client.listWorkouts()).rejects.toThrow('HEVY_API_KEY is not configured');
  });

  it('does not expose a key in remote failure messages', async () => {
    process.env.HEVY_API_KEY = 'secret-should-not-appear';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, false, 401)));
    const client = new HevyClient();

    await expect(client.listWorkouts()).rejects.toThrow('Hevy rejected the configured API key');
    vi.unstubAllGlobals();
    delete process.env.HEVY_API_KEY;
  });

  it('requests workout events only through a GET request with a since cursor', async () => {
    process.env.HEVY_API_KEY = 'sanitized-test-key';
    const fetchMock = vi.fn().mockResolvedValue(response(workoutEventsPage));
    vi.stubGlobal('fetch', fetchMock);

    const client = new HevyClient();
    await expect(
      client.listWorkoutEvents(new Date('2026-07-20T00:00:00.000Z')),
    ).resolves.toHaveLength(2);

    expect(fetchMock.mock.calls[0][0].toString()).toContain('since=2026-07-20T00%3A00%3A00.000Z');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
    vi.unstubAllGlobals();
    delete process.env.HEVY_API_KEY;
  });

  it('accepts the live workout-events collection key returned by Hevy', async () => {
    process.env.HEVY_API_KEY = 'sanitized-test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ page: 1, page_count: 1, workouts: [] })),
    );

    await expect(
      new HevyClient().listWorkoutEvents(new Date('2026-08-01T00:00:00.000Z')),
    ).resolves.toEqual([]);

    vi.unstubAllGlobals();
    delete process.env.HEVY_API_KEY;
  });
});

describe('HevySyncService mapping', () => {
  it('maps sanitized workout, template, and body-measurement fixtures to local data', () => {
    const service = new HevySyncService({} as never, {} as never) as unknown as {
      workoutData: (
        workout: HevyWorkout,
        templates: Map<string, HevyExerciseTemplate>,
      ) => Record<string, unknown>;
      templateData: (template: HevyExerciseTemplate) => Record<string, unknown>;
      measurementData: (
        measurement: (typeof bodyMeasurementsPage.body_measurements)[number],
      ) => Record<string, unknown>;
    };
    const template = templatesPage.exercise_templates[0] as HevyExerciseTemplate;
    const workout = service.workoutData(
      workoutsPage.workouts[0] as HevyWorkout,
      new Map([[template.id, template]]),
    );

    expect(workout).toMatchObject({
      id: 'workout_fixture_1',
      title: 'Fixture upper body',
      startedAt: new Date('2026-07-20T18:00:00.000Z'),
      exercises: {
        create: [
          {
            templateId: 'template_bench',
            name: 'Bench Press',
            muscleGroup: 'chest',
            sets: {
              create: [
                { ordinal: 0, weightKg: 80, reps: 8, rpe: 8 },
                { ordinal: 1, weightKg: 80, reps: 7, rpe: 8.5 },
              ],
            },
          },
        ],
      },
    });
    expect(service.templateData(template)).toMatchObject({
      id: 'template_bench',
      primaryMuscleGroup: 'chest',
      isCustom: false,
    });
    expect(service.measurementData(bodyMeasurementsPage.body_measurements[0])).toMatchObject({
      weightKg: 80.4,
      bodyFatPercentage: 18.2,
      waistCm: 82,
      bicepCm: 38,
    });
  });
});

describe('HevySyncService incremental reconciliation', () => {
  it('reconciles update and delete events idempotently', async () => {
    const upsert = vi.fn();
    const deleteMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const transaction = vi.fn(async (callback) => callback({ workout: { upsert, deleteMany } }));
    const service = new HevySyncService(
      {
        hevyExerciseTemplate: { findMany: vi.fn().mockResolvedValue([]) },
        $transaction: transaction,
      } as never,
      { listWorkoutEvents: vi.fn().mockResolvedValue(workoutEventsPage.events) } as never,
    ) as unknown as {
      syncIncremental: (since: Date) => Promise<{ updated: number; deleted: number }>;
    };
    const since = new Date('2026-07-20T00:00:00.000Z');

    await expect(service.syncIncremental(since)).resolves.toEqual({
      imported: 0,
      updated: 1,
      deleted: 1,
      message: 'Applied 1 workout updates and 1 deletions since 2026-07-20T00:00:00.000Z.',
    });
    await expect(service.syncIncremental(since)).resolves.toMatchObject({ updated: 1, deleted: 0 });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(deleteMany).toHaveBeenLastCalledWith({ where: { id: 'workout_fixture_deleted' } });
  });
});

describe('HevySyncService report boundary', () => {
  it('never generates or replaces a weekly report when a sync succeeds', async () => {
    const weeklyReportUpsert = vi.fn();
    const service = new HevySyncService(
      {
        syncState: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
        syncLog: { create: vi.fn().mockResolvedValue({ id: 'sync' }), update: vi.fn() },
        weeklyReport: { upsert: weeklyReportUpsert },
      } as never,
      {} as never,
    ) as unknown as { sync: () => Promise<unknown>; syncInitial: () => Promise<unknown> };
    service.syncInitial = vi.fn().mockResolvedValue({
      imported: 1,
      updated: 0,
      deleted: 0,
      message: 'Imported 1 workout.',
    });

    await service.sync();

    expect(weeklyReportUpsert).not.toHaveBeenCalled();
  });
});
