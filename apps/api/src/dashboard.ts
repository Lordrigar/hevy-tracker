import {
  calculateTrainingPeriod,
  compareTrainingPeriods,
  type AnalyticsWorkout,
} from '@hevy/analytics';
import { BadRequestException, Controller, Get, Injectable, Query } from '@nestjs/common';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
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

export type WorkoutHistoryItem = {
  id: string;
  title: string;
  startedAt: Date;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
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

  private async workoutsIn(start: Date, endExclusive: Date): Promise<AnalyticsWorkout[]> {
    const workouts = await this.prisma.workout.findMany({
      where: { startedAt: { gte: start, lt: endExclusive } },
      include: { exercises: { include: { sets: { orderBy: { ordinal: 'asc' } } } } },
      orderBy: { startedAt: 'asc' },
    });
    return workouts.map((workout) => ({
      id: workout.id,
      title: workout.title,
      startedAt: workout.startedAt,
      exercises: workout.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        templateId: exercise.templateId,
        muscleGroup: exercise.muscleGroup,
        sets: exercise.sets.map((set) => ({
          weightKg: set.weightKg,
          reps: set.reps,
          rpe: set.rpe,
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
