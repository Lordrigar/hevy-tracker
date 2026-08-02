import { describe, expect, it, vi } from 'vitest';
import { RoutineService } from './routines';
import type { HevyRoutine } from './hevy';

describe('RoutineService facts', () => {
  it('calculates direct and half-credit indirect sets, ignores warmups, and flags duplicates and unknown templates', () => {
    const service = new RoutineService({} as never, {} as never) as unknown as {
      facts: (
        exercises: unknown[],
        templates: Map<string, unknown>,
      ) => {
        plannedExerciseCount: number;
        muscleGroups: Array<{ muscleGroup: string; directSets: number; indirectSets: number }>;
        duplicateExercises: string[];
        unknownTemplateExercises: string[];
      };
    };
    const facts = service.facts(
      [
        {
          templateId: 'bench',
          name: 'Bench Press',
          sets: [{ type: 'normal' }, { type: 'warmup' }],
        },
        { templateId: 'bench', name: 'Bench Press', sets: [{ type: 'normal' }] },
        { templateId: 'missing', name: 'Mystery move', sets: [{ type: 'normal' }] },
      ],
      new Map([['bench', { primaryMuscleGroup: 'chest', secondaryMuscleGroups: ['triceps'] }]]),
    );

    expect(facts.plannedExerciseCount).toBe(3);
    expect(facts.muscleGroups).toEqual([
      { muscleGroup: 'chest', directSets: 2, indirectSets: 0 },
      { muscleGroup: 'triceps', directSets: 0, indirectSets: 1 },
    ]);
    expect(facts.duplicateExercises).toEqual(['Bench Press']);
    expect(facts.unknownTemplateExercises).toEqual(['Mystery move']);
  });
});

describe('RoutineService persistence mapping', () => {
  it('normalizes numeric Hevy folder IDs before saving', async () => {
    const upsert = vi.fn();
    const service = new RoutineService({} as never, {} as never) as unknown as {
      upsert: (
        tx: unknown,
        routine: HevyRoutine,
        folders: Map<string, string | null>,
      ) => Promise<void>;
    };
    await service.upsert(
      { routine: { upsert } },
      { id: 'routine-1', index: 4, title: 'Fixture', folder_id: 12 },
      new Map([['12', 'Upper']]),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ folderId: '12', folder: 'Upper', ordinal: 4 }),
      }),
    );
  });
});
