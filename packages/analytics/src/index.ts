export type AnalyticsSet = {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
};

export type AnalyticsExercise = {
  id: string;
  name: string;
  templateId: string | null;
  muscleGroup: string | null;
  isBodyweight?: boolean;
  sets: AnalyticsSet[];
};

export type AnalyticsWorkout = {
  id: string;
  title: string;
  startedAt: Date;
  bodyWeightKg?: number | null;
  exercises: AnalyticsExercise[];
};

export type TrainingTotals = {
  workoutCount: number;
  setCount: number;
  repCount: number;
  volumeKg: number;
  averageRpe: number | null;
  bodyweightCoverage: BodyweightCoverage;
};

/**
 * Coverage and volume facts for imported bodyweight exercises. A missing body
 * measurement never gets estimated: its volume contains recorded external load
 * only, and is reported separately from effective bodyweight volume.
 */
export type BodyweightCoverage = {
  setCount: number;
  setsWithBodyWeight: number;
  setsWithoutBodyWeight: number;
  effectiveVolumeKg: number;
  externalLoadOnlyVolumeKg: number;
};

export type ExerciseSummary = TrainingTotals & {
  exerciseKey: string;
  exerciseName: string;
  maxLoadKg: number | null;
  highLoadPrDates: string[];
};

export type MuscleGroupSummary = {
  muscleGroup: string;
  setCount: number;
  repCount: number;
  volumeKg: number;
};

export type TrainingPeriod = {
  totals: TrainingTotals;
  exercises: ExerciseSummary[];
  muscleGroups: MuscleGroupSummary[];
};

export type MetricChange = {
  current: number | null;
  previous: number | null;
  change: number | null;
};

export type PeriodComparison = {
  current: TrainingPeriod;
  previous: TrainingPeriod;
  changes: {
    workoutCount: MetricChange;
    setCount: MetricChange;
    repCount: MetricChange;
    volumeKg: MetricChange;
    averageRpe: MetricChange;
    muscleGroups: Array<
      MuscleGroupSummary & {
        previousVolumeKg: number;
        volumeChangeKg: number;
      }
    >;
  };
};

type MutableTotals = TrainingTotals & { rpeTotal: number; rpeCount: number };
type MutableExercise = MutableTotals & {
  exerciseKey: string;
  exerciseName: string;
  workoutIds: Set<string>;
  maxLoadKg: number | null;
  highLoadPrDates: Set<string>;
};

const unknownMuscleGroup = 'Unclassified';

/**
 * Counts every imported set. Volume includes only sets with both a non-negative
 * load and a non-negative rep count. Missing RPE values are excluded from its
 * average. High-load PRs are the maximum single-set load for each exercise;
 * ties retain every workout date that achieved the maximum.
 */
export function calculateTrainingPeriod(workouts: AnalyticsWorkout[]): TrainingPeriod {
  const totals = emptyTotals();
  const exercises = new Map<string, MutableExercise>();
  const muscleGroups = new Map<string, MuscleGroupSummary>();

  for (const workout of workouts) {
    totals.workoutCount += 1;
    const date = workout.startedAt.toISOString().slice(0, 10);
    for (const exercise of workout.exercises) {
      const exerciseKey = exercise.templateId || exercise.name.trim().toLocaleLowerCase();
      const exerciseSummary =
        exercises.get(exerciseKey) || emptyExercise(exerciseKey, exercise.name);
      exercises.set(exerciseKey, exerciseSummary);
      exerciseSummary.workoutIds.add(workout.id);
      const muscleGroup = exercise.muscleGroup?.trim() || unknownMuscleGroup;
      const muscleSummary = muscleGroups.get(muscleGroup) || emptyMuscleGroup(muscleGroup);
      muscleGroups.set(muscleGroup, muscleSummary);

      for (const set of exercise.sets) {
        totals.setCount += 1;
        exerciseSummary.setCount += 1;
        muscleSummary.setCount += 1;

        const reps = validNumber(set.reps);
        if (reps !== null) {
          totals.repCount += reps;
          exerciseSummary.repCount += reps;
          muscleSummary.repCount += reps;
        }

        const externalWeightKg = validNumber(set.weightKg) ?? 0;
        const bodyWeightKg = exercise.isBodyweight
          ? validNumber(workout.bodyWeightKg ?? null)
          : null;
        if (exercise.isBodyweight) {
          addBodyweightSet(totals.bodyweightCoverage, bodyWeightKg);
          addBodyweightSet(exerciseSummary.bodyweightCoverage, bodyWeightKg);
        }
        const weightKg =
          bodyWeightKg === null ? validNumber(set.weightKg) : bodyWeightKg + externalWeightKg;
        if (weightKg !== null && reps !== null) {
          const volumeKg = weightKg * reps;
          totals.volumeKg += volumeKg;
          exerciseSummary.volumeKg += volumeKg;
          muscleSummary.volumeKg += volumeKg;
          if (exercise.isBodyweight) {
            if (bodyWeightKg === null)
              totals.bodyweightCoverage.externalLoadOnlyVolumeKg += volumeKg;
            else totals.bodyweightCoverage.effectiveVolumeKg += volumeKg;
            if (bodyWeightKg === null)
              exerciseSummary.bodyweightCoverage.externalLoadOnlyVolumeKg += volumeKg;
            else exerciseSummary.bodyweightCoverage.effectiveVolumeKg += volumeKg;
          }
        }

        if (weightKg !== null) {
          if (exerciseSummary.maxLoadKg === null || weightKg > exerciseSummary.maxLoadKg) {
            exerciseSummary.maxLoadKg = weightKg;
            exerciseSummary.highLoadPrDates = new Set([date]);
          } else if (weightKg === exerciseSummary.maxLoadKg) {
            exerciseSummary.highLoadPrDates.add(date);
          }
        }

        const rpe = validNumber(set.rpe);
        if (rpe !== null) {
          addRpe(totals, rpe);
          addRpe(exerciseSummary, rpe);
        }
      }
    }
  }

  return {
    totals: finaliseTotals(totals),
    exercises: [...exercises.values()]
      .map((exercise) => ({
        ...finaliseTotals(exercise),
        workoutCount: exercise.workoutIds.size,
        exerciseKey: exercise.exerciseKey,
        exerciseName: exercise.exerciseName,
        maxLoadKg: exercise.maxLoadKg,
        highLoadPrDates: [...exercise.highLoadPrDates].sort(),
      }))
      .sort((left, right) => left.exerciseName.localeCompare(right.exerciseName)),
    muscleGroups: [...muscleGroups.values()].sort((left, right) =>
      left.muscleGroup.localeCompare(right.muscleGroup),
    ),
  };
}

export function compareTrainingPeriods(
  currentWorkouts: AnalyticsWorkout[],
  previousWorkouts: AnalyticsWorkout[],
): PeriodComparison {
  const current = calculateTrainingPeriod(currentWorkouts);
  const previous = calculateTrainingPeriod(previousWorkouts);
  const previousMuscleGroups = new Map(
    previous.muscleGroups.map((muscleGroup) => [muscleGroup.muscleGroup, muscleGroup]),
  );
  const muscleGroupNames = new Set([
    ...current.muscleGroups.map((muscleGroup) => muscleGroup.muscleGroup),
    ...previous.muscleGroups.map((muscleGroup) => muscleGroup.muscleGroup),
  ]);

  return {
    current,
    previous,
    changes: {
      workoutCount: numericChange(current.totals.workoutCount, previous.totals.workoutCount),
      setCount: numericChange(current.totals.setCount, previous.totals.setCount),
      repCount: numericChange(current.totals.repCount, previous.totals.repCount),
      volumeKg: numericChange(current.totals.volumeKg, previous.totals.volumeKg),
      averageRpe: numericChange(current.totals.averageRpe, previous.totals.averageRpe),
      muscleGroups: [...muscleGroupNames]
        .map((muscleGroup) => {
          const currentSummary =
            current.muscleGroups.find((summary) => summary.muscleGroup === muscleGroup) ||
            emptyMuscleGroup(muscleGroup);
          const previousVolumeKg = previousMuscleGroups.get(muscleGroup)?.volumeKg || 0;
          return {
            ...currentSummary,
            previousVolumeKg,
            volumeChangeKg: currentSummary.volumeKg - previousVolumeKg,
          };
        })
        .sort((left, right) => left.muscleGroup.localeCompare(right.muscleGroup)),
    },
  };
}

function emptyTotals(): MutableTotals {
  return {
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
    rpeTotal: 0,
    rpeCount: 0,
  };
}

function emptyExercise(exerciseKey: string, exerciseName: string): MutableExercise {
  return {
    ...emptyTotals(),
    exerciseKey,
    exerciseName,
    workoutIds: new Set(),
    maxLoadKg: null,
    highLoadPrDates: new Set(),
  };
}

function emptyMuscleGroup(muscleGroup: string): MuscleGroupSummary {
  return { muscleGroup, setCount: 0, repCount: 0, volumeKg: 0 };
}

function addRpe(totals: MutableTotals, rpe: number) {
  totals.rpeCount += 1;
  totals.rpeTotal += rpe;
}

function addBodyweightSet(coverage: BodyweightCoverage, bodyWeightKg: number | null) {
  coverage.setCount += 1;
  if (bodyWeightKg === null) coverage.setsWithoutBodyWeight += 1;
  else coverage.setsWithBodyWeight += 1;
}

function finaliseTotals(totals: MutableTotals): TrainingTotals {
  return {
    workoutCount: totals.workoutCount,
    setCount: totals.setCount,
    repCount: totals.repCount,
    volumeKg: totals.volumeKg,
    averageRpe: totals.rpeCount === 0 ? null : totals.rpeTotal / totals.rpeCount,
    bodyweightCoverage: { ...totals.bodyweightCoverage },
  };
}

function validNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
}

function numericChange(current: number | null, previous: number | null): MetricChange {
  return {
    current,
    previous,
    change: current === null || previous === null ? null : current - previous,
  };
}
