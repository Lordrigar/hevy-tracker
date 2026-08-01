import { describe, expect, it } from 'vitest';
import { calculateTrainingPeriod, compareTrainingPeriods, type AnalyticsWorkout } from './index';

const workouts: AnalyticsWorkout[] = [
  {
    id: 'workout-1',
    title: 'Upper',
    startedAt: new Date('2026-07-20T10:00:00.000Z'),
    exercises: [
      {
        id: 'exercise-1',
        templateId: 'bench',
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [
          { weightKg: 80, reps: 8, rpe: 8 },
          { weightKg: 80, reps: 7, rpe: null },
          { weightKg: null, reps: 10, rpe: 7 },
        ],
      },
    ],
  },
  {
    id: 'workout-2',
    title: 'Upper',
    startedAt: new Date('2026-07-21T10:00:00.000Z'),
    exercises: [
      {
        id: 'exercise-2',
        templateId: 'bench',
        name: 'Bench Press',
        muscleGroup: 'chest',
        sets: [{ weightKg: 80, reps: 6, rpe: 9 }],
      },
      {
        id: 'exercise-3',
        templateId: null,
        name: 'Carry',
        muscleGroup: null,
        sets: [{ weightKg: 20, reps: null, rpe: null }],
      },
    ],
  },
];

describe('calculateTrainingPeriod', () => {
  it('calculates deterministic volume, set, rep, RPE, PR, and muscle-group facts', () => {
    expect(calculateTrainingPeriod(workouts)).toEqual({
      totals: { workoutCount: 2, setCount: 5, repCount: 31, volumeKg: 1680, averageRpe: 8 },
      exercises: [
        {
          exerciseKey: 'bench',
          exerciseName: 'Bench Press',
          workoutCount: 2,
          setCount: 4,
          repCount: 31,
          volumeKg: 1680,
          averageRpe: 8,
          maxLoadKg: 80,
          highLoadPrDates: ['2026-07-20', '2026-07-21'],
        },
        {
          exerciseKey: 'carry',
          exerciseName: 'Carry',
          workoutCount: 1,
          setCount: 1,
          repCount: 0,
          volumeKg: 0,
          averageRpe: null,
          maxLoadKg: 20,
          highLoadPrDates: ['2026-07-21'],
        },
      ],
      muscleGroups: [
        { muscleGroup: 'chest', setCount: 4, repCount: 31, volumeKg: 1680 },
        { muscleGroup: 'Unclassified', setCount: 1, repCount: 0, volumeKg: 0 },
      ],
    });
  });

  it('returns stable empty-period facts', () => {
    expect(calculateTrainingPeriod([])).toEqual({
      totals: { workoutCount: 0, setCount: 0, repCount: 0, volumeKg: 0, averageRpe: null },
      exercises: [],
      muscleGroups: [],
    });
  });
});

describe('compareTrainingPeriods', () => {
  it('compares current and previous periods, including added and removed muscle groups', () => {
    const previous = [{ ...workouts[0], exercises: [workouts[0].exercises[0]] }];
    const comparison = compareTrainingPeriods([workouts[1]], previous);

    expect(comparison.changes.volumeKg).toEqual({ current: 480, previous: 1200, change: -720 });
    expect(comparison.changes.averageRpe).toEqual({ current: 9, previous: 7.5, change: 1.5 });
    expect(comparison.changes.muscleGroups).toEqual([
      {
        muscleGroup: 'chest',
        setCount: 1,
        repCount: 6,
        volumeKg: 480,
        previousVolumeKg: 1200,
        volumeChangeKg: -720,
      },
      {
        muscleGroup: 'Unclassified',
        setCount: 1,
        repCount: 0,
        volumeKg: 0,
        previousVolumeKg: 0,
        volumeChangeKg: 0,
      },
    ]);
  });
});
