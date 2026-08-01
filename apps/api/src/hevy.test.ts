import { describe, expect, it, vi } from 'vitest';
import bodyMeasurementsPage from './fixtures/hevy-body-measurements-page.json';
import templatesPage from './fixtures/hevy-templates-page.json';
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
