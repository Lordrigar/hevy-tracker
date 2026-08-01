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
  it('calculates effective bodyweight load with same-day and earlier measurements', () => {
    const result = calculateTrainingPeriod([
      {
        id: 'same-day',
        title: 'Same day',
        startedAt: new Date('2026-07-20T18:00:00.000Z'),
        bodyWeightKg: 75,
        exercises: [
          {
            id: 'pullup-same-day',
            templateId: 'pullup',
            name: 'Pull Up',
            muscleGroup: 'lats',
            isBodyweight: true,
            sets: [{ weightKg: 2.5, reps: 10, rpe: null }],
          },
        ],
      },
      {
        id: 'earlier',
        title: 'Earlier',
        startedAt: new Date('2026-07-21'),
        bodyWeightKg: 75,
        exercises: [
          {
            id: 'pullup-earlier',
            templateId: 'pullup',
            name: 'Pull Up',
            muscleGroup: 'lats',
            isBodyweight: true,
            sets: [{ weightKg: null, reps: 10, rpe: null }],
          },
        ],
      },
    ]);
    expect(result.totals).toMatchObject({
      volumeKg: 1525,
      bodyweightCoverage: {
        setCount: 2,
        setsWithBodyWeight: 2,
        setsWithoutBodyWeight: 0,
        effectiveVolumeKg: 1525,
        externalLoadOnlyVolumeKg: 0,
      },
    });
  });

  it('uses external load only, with explicit coverage, when body weight is missing', () => {
    const result = calculateTrainingPeriod([
      {
        id: 'later-only',
        title: 'Later only',
        startedAt: new Date('2026-07-01'),
        bodyWeightKg: null,
        exercises: [
          {
            id: 'pullup-later-only',
            templateId: 'pullup',
            name: 'Pull Up',
            muscleGroup: 'lats',
            isBodyweight: true,
            sets: [{ weightKg: 5, reps: 5, rpe: null }],
          },
        ],
      },
      {
        id: 'unweighted',
        title: 'Unweighted',
        startedAt: new Date('2026-07-02'),
        bodyWeightKg: null,
        exercises: [
          {
            id: 'pullup-unweighted',
            templateId: 'pullup',
            name: 'Pull Up',
            muscleGroup: 'lats',
            isBodyweight: true,
            sets: [{ weightKg: null, reps: 5, rpe: null }],
          },
        ],
      },
    ]);
    expect(result.totals).toMatchObject({
      volumeKg: 25,
      bodyweightCoverage: {
        setCount: 2,
        setsWithBodyWeight: 0,
        setsWithoutBodyWeight: 2,
        effectiveVolumeKg: 0,
        externalLoadOnlyVolumeKg: 25,
      },
    });
  });

  it('excludes warm-up sets and credits secondary muscles with reps, volume, and half a set', () => {
    const result = calculateTrainingPeriod([
      {
        id: 'upper',
        title: 'Upper',
        startedAt: new Date('2026-07-20'),
        exercises: [
          {
            id: 'bench',
            templateId: 'bench',
            name: 'Bench Press',
            muscleGroup: 'chest',
            secondaryMuscleGroups: ['triceps', 'front_delts'],
            sets: [
              { weightKg: 40, reps: 10, rpe: null, isWarmup: true },
              { weightKg: 80, reps: 8, rpe: null },
            ],
          },
        ],
      },
    ]);
    expect(result.totals).toMatchObject({ setCount: 1, repCount: 8, volumeKg: 640 });
    expect(result.muscleGroups).toEqual([
      { muscleGroup: 'chest', setCount: 1, repCount: 8, volumeKg: 640 },
      { muscleGroup: 'front_delts', setCount: 0.5, repCount: 8, volumeKg: 640 },
      { muscleGroup: 'triceps', setCount: 0.5, repCount: 8, volumeKg: 640 },
    ]);
  });
  it('calculates deterministic volume, set, rep, RPE, PR, and muscle-group facts', () => {
    expect(calculateTrainingPeriod(workouts)).toEqual({
      totals: {
        workoutCount: 2,
        setCount: 5,
        repCount: 31,
        volumeKg: 1680,
        averageRpe: 8,
        bodyweightCoverage: {
          setCount: 0,
          setsWithBodyWeight: 0,
          setsWithoutBodyWeight: 0,
          effectiveVolumeKg: 0,
          externalLoadOnlyVolumeKg: 0,
        },
      },
      exercises: [
        {
          exerciseKey: 'bench',
          exerciseName: 'Bench Press',
          muscleGroup: 'chest',
          secondaryMuscleGroups: [],
          workoutCount: 2,
          setCount: 4,
          repCount: 31,
          volumeKg: 1680,
          averageRpe: 8,
          bodyweightCoverage: {
            setCount: 0,
            setsWithBodyWeight: 0,
            setsWithoutBodyWeight: 0,
            effectiveVolumeKg: 0,
            externalLoadOnlyVolumeKg: 0,
          },
          maxLoadKg: 80,
          highLoadPrDates: ['2026-07-20', '2026-07-21'],
        },
        {
          exerciseKey: 'carry',
          exerciseName: 'Carry',
          muscleGroup: 'Unclassified',
          secondaryMuscleGroups: [],
          workoutCount: 1,
          setCount: 1,
          repCount: 0,
          volumeKg: 0,
          averageRpe: null,
          bodyweightCoverage: {
            setCount: 0,
            setsWithBodyWeight: 0,
            setsWithoutBodyWeight: 0,
            effectiveVolumeKg: 0,
            externalLoadOnlyVolumeKg: 0,
          },
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
      totals: {
        workoutCount: 0,
        setCount: 0,
        repCount: 0,
        volumeKg: 0,
        averageRpe: null,
        bodyweightCoverage: {
          setCount: 0,
          setsWithBodyWeight: 0,
          setsWithoutBodyWeight: 0,
          effectiveVolumeKg: 0,
          externalLoadOnlyVolumeKg: 0,
        },
      },
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
