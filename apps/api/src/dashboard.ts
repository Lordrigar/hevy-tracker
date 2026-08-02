import {
  calculateTrainingPeriod,
  compareTrainingPeriods,
  type AnalyticsWorkout,
} from '@hevy/analytics';
import { BadRequestException, Controller, Get, Injectable, Post, Query } from '@nestjs/common';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';

export class AnalyticsPeriodQuery {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class ExerciseTrendQuery extends AnalyticsPeriodQuery {
  @IsString()
  @IsNotEmpty()
  exercise!: string;
}

export class WeeklyReportQuery {
  @IsOptional()
  @IsDateString()
  weekStart?: string;
}

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  totals: {
    workoutCount: number;
    setCount: number;
    repCount: number;
    volumeKg: number;
    averageRpe: number | null;
  };
  changes: {
    workoutCount: number | null;
    setCount: number | null;
    repCount: number | null;
    volumeKg: number | null;
  };
  prs: Array<{
    exerciseKey: string;
    exerciseName: string;
    maxLoadKg: number;
    achievedOn: string[];
  }>;
  strengthChanges: Array<{
    exerciseKey: string;
    exerciseName: string;
    currentMaxLoadKg: number;
    previousMaxLoadKg: number | null;
    changeKg: number | null;
  }>;
  muscleGroupVolumeDeltas: Array<{
    muscleGroup: string;
    currentVolumeKg: number;
    previousVolumeKg: number;
    changeKg: number;
  }>;
};

export type WorkoutHistoryItem = {
  id: string;
  title: string;
  startedAt: Date;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
};

export type BodyMeasurementHistoryItem = {
  date: Date;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  bicepCm: number | null;
};

@Injectable()
export class DashboardAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: AnalyticsPeriodQuery) {
    const period = this.periodFrom(query);
    const [currentWorkouts, previousWorkouts] = await Promise.all([
      this.workoutsIn(period.currentStart, period.currentEndExclusive),
      this.workoutsIn(period.previousStart, period.currentStart),
    ]);
    return {
      period: { from: query.from, to: query.to },
      previousPeriod: {
        from: dateOnly(period.previousStart),
        to: dateOnly(new Date(period.currentStart.getTime() - 1)),
      },
      ...compareTrainingPeriods(currentWorkouts, previousWorkouts),
    };
  }

  async exerciseTrend(query: ExerciseTrendQuery) {
    const period = this.periodFrom(query);
    const workouts = await this.workoutsIn(period.currentStart, period.currentEndExclusive);
    const analytics = calculateTrainingPeriod(workouts);
    const exercise = query.exercise.trim().toLocaleLowerCase();
    return {
      period: { from: query.from, to: query.to },
      exercise,
      trend: analytics.exercises.filter(
        (summary) =>
          summary.exerciseKey === exercise || summary.exerciseName.toLocaleLowerCase() === exercise,
      ),
    };
  }

  async workoutHistory(query: AnalyticsPeriodQuery): Promise<WorkoutHistoryItem[]> {
    const period = this.periodFrom(query);
    const workouts = await this.workoutsIn(period.currentStart, period.currentEndExclusive);
    return workouts
      .map((workout) => ({
        id: workout.id,
        title: workout.title,
        startedAt: workout.startedAt,
        exerciseCount: workout.exercises.length,
        setCount: workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0),
        volumeKg: workout.exercises.reduce(
          (total, exercise) =>
            total +
            exercise.sets.reduce(
              (exerciseTotal, set) => exerciseTotal + (set.weightKg ?? 0) * (set.reps ?? 0),
              0,
            ),
          0,
        ),
      }))
      .reverse();
  }

  async measurementHistory(query: AnalyticsPeriodQuery): Promise<BodyMeasurementHistoryItem[]> {
    const period = this.periodFrom(query);
    return this.prisma.hevyBodyMeasurement.findMany({
      where: { date: { gte: period.currentStart, lt: period.currentEndExclusive } },
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
  }

  async weeklyReport(query: WeeklyReportQuery): Promise<WeeklyReport | null> {
    const stored = query.weekStart
      ? await this.prisma.weeklyReport.findUnique({
          where: { weekStart: parseDate(query.weekStart, 'weekStart') },
        })
      : await this.prisma.weeklyReport.findFirst({ orderBy: { weekStart: 'desc' } });
    return stored ? (stored.report as WeeklyReport) : null;
  }

  async generateWeeklyReport(query: WeeklyReportQuery): Promise<WeeklyReport> {
    const weekStart = query.weekStart
      ? parseDate(query.weekStart, 'weekStart')
      : rollingWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const period = this.periodFrom({ from: dateOnly(weekStart), to: dateOnly(weekEnd) });
    const [currentWorkouts, previousWorkouts] = await Promise.all([
      this.workoutsIn(period.currentStart, period.currentEndExclusive),
      this.workoutsIn(period.previousStart, period.currentStart),
    ]);
    const comparison = compareTrainingPeriods(currentWorkouts, previousWorkouts);
    const previousExercises = new Map(
      comparison.previous.exercises.map((exercise) => [exercise.exerciseKey, exercise]),
    );
    const report: WeeklyReport = {
      weekStart: dateOnly(weekStart),
      weekEnd: dateOnly(weekEnd),
      generatedAt: new Date().toISOString(),
      totals: {
        workoutCount: comparison.current.totals.workoutCount,
        setCount: comparison.current.totals.setCount,
        repCount: comparison.current.totals.repCount,
        volumeKg: comparison.current.totals.volumeKg,
        averageRpe: comparison.current.totals.averageRpe,
      },
      changes: {
        workoutCount: comparison.changes.workoutCount.change,
        setCount: comparison.changes.setCount.change,
        repCount: comparison.changes.repCount.change,
        volumeKg: comparison.changes.volumeKg.change,
      },
      prs: comparison.current.exercises
        .filter((exercise) => exercise.maxLoadKg !== null)
        .map((exercise) => ({
          exerciseKey: exercise.exerciseKey,
          exerciseName: exercise.exerciseName,
          maxLoadKg: exercise.maxLoadKg!,
          achievedOn: exercise.highLoadPrDates,
        })),
      strengthChanges: comparison.current.exercises
        .filter((exercise) => exercise.maxLoadKg !== null)
        .map((exercise) => {
          const previousMaxLoadKg = previousExercises.get(exercise.exerciseKey)?.maxLoadKg ?? null;
          return {
            exerciseKey: exercise.exerciseKey,
            exerciseName: exercise.exerciseName,
            currentMaxLoadKg: exercise.maxLoadKg!,
            previousMaxLoadKg,
            changeKg: previousMaxLoadKg === null ? null : exercise.maxLoadKg! - previousMaxLoadKg,
          };
        }),
      muscleGroupVolumeDeltas: comparison.changes.muscleGroups.map((muscleGroup) => ({
        muscleGroup: muscleGroup.muscleGroup,
        currentVolumeKg: muscleGroup.volumeKg,
        previousVolumeKg: muscleGroup.previousVolumeKg,
        changeKg: muscleGroup.volumeChangeKg,
      })),
    };
    await this.prisma.weeklyReport.upsert({
      where: { weekStart },
      create: { weekStart, report },
      update: { report },
    });
    return report;
  }

  private async workoutsIn(start: Date, endExclusive: Date): Promise<AnalyticsWorkout[]> {
    const [workouts, templates, measurements] = await Promise.all([
      this.prisma.workout.findMany({
        where: { startedAt: { gte: start, lt: endExclusive } },
        include: { exercises: { include: { sets: { orderBy: { ordinal: 'asc' } } } } },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.hevyExerciseTemplate.findMany(),
      this.prisma.hevyBodyMeasurement.findMany({
        where: { date: { lt: endExclusive } },
        orderBy: { date: 'asc' },
      }),
    ]);
    const templatesById = new Map(templates.map((template) => [template.id, template]));
    return workouts.map((workout) => ({
      id: workout.id,
      title: workout.title,
      startedAt: workout.startedAt,
      bodyWeightKg: latestWeightAt(measurements, workout.startedAt),
      exercises: workout.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        templateId: exercise.templateId,
        muscleGroup: exercise.muscleGroup,
        secondaryMuscleGroups: secondaryMuscleGroups(
          templatesById.get(exercise.templateId || '')?.secondaryMuscleGroups,
        ),
        isBodyweight: ['reps_only', 'bodyweight_weighted'].includes(
          templatesById.get(exercise.templateId || '')?.type || '',
        ),
        sets: exercise.sets.map((set) => ({
          weightKg: set.weightKg,
          reps: set.reps,
          rpe: set.rpe,
          isWarmup: set.isWarmup,
        })),
      })),
    }));
  }

  private periodFrom(query: AnalyticsPeriodQuery) {
    const currentStart = parseDate(query.from, 'from');
    const currentEnd = parseDate(query.to, 'to');
    if (currentEnd < currentStart) throw new BadRequestException('to must be on or after from');
    const currentEndExclusive = new Date(currentEnd);
    currentEndExclusive.setUTCDate(currentEndExclusive.getUTCDate() + 1);
    const durationMs = currentEndExclusive.getTime() - currentStart.getTime();
    return {
      currentStart,
      currentEndExclusive,
      previousStart: new Date(currentStart.getTime() - durationMs),
    };
  }
}

function latestWeightAt(
  measurements: Array<{ date: Date; weightKg: number | null }>,
  workoutDate: Date,
) {
  for (let index = measurements.length - 1; index >= 0; index -= 1) {
    const measurement = measurements[index];
    if (measurement.date <= workoutDate && measurement.weightKg !== null)
      return measurement.weightKg;
  }
  return null;
}

function secondaryMuscleGroups(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

@Controller('dashboard')
export class DashboardAnalyticsController {
  constructor(private readonly analytics: DashboardAnalyticsService) {}

  @Get('overview')
  overview(@Query() query: AnalyticsPeriodQuery) {
    return this.analytics.overview(query);
  }

  @Get('exercise-trend')
  exerciseTrend(@Query() query: ExerciseTrendQuery) {
    return this.analytics.exerciseTrend(query);
  }

  @Get('workout-history')
  workoutHistory(@Query() query: AnalyticsPeriodQuery) {
    return this.analytics.workoutHistory(query);
  }

  @Get('measurements')
  measurementHistory(@Query() query: AnalyticsPeriodQuery) {
    return this.analytics.measurementHistory(query);
  }

  @Get('weekly-report')
  weeklyReport(@Query() query: WeeklyReportQuery) {
    return this.analytics.weeklyReport(query);
  }

  @Post('weekly-report')
  generateWeeklyReport(@Query() query: WeeklyReportQuery) {
    return this.analytics.generateWeeklyReport(query);
  }
}

function parseDate(value: string, name: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${name} must use YYYY-MM-DD`);
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || dateOnly(result) !== value) {
    throw new BadRequestException(`${name} must be a valid calendar date`);
  }
  return result;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function rollingWeekStart(now: Date) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 6);
  return end;
}
