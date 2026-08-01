import {
  BadGatewayException,
  Controller,
  Get,
  Injectable,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

const HEVY_API_URL = 'https://api.hevyapp.com/v1';
const PAGE_SIZE = 10;

type HevySet = {
  weight_kg?: number | null;
  reps?: number | null;
  rpe?: number | null;
};

type HevyExercise = {
  exercise_template_id?: string | null;
  title?: string | null;
  sets?: HevySet[];
};

export type HevyWorkout = {
  id: string;
  title?: string | null;
  start_time: string;
  end_time?: string | null;
  exercises?: HevyExercise[];
};

export type HevyExerciseTemplate = {
  id: string;
  title: string;
  type?: string | null;
  primary_muscle_group?: string | null;
  secondary_muscle_groups?: string[] | null;
  is_custom?: boolean | null;
};

export type HevyBodyMeasurement = {
  date: string;
  weight_kg?: number | null;
  body_fat_percentage?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  biceps?: number | null;
};

type PaginatedResponse<T, K extends string> = {
  page: number;
  page_count: number;
} & Record<K, T[]>;

export class HevyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HevyApiError';
  }
}

@Injectable()
export class HevyClient {
  private readonly baseUrl = process.env.HEVY_API_URL || HEVY_API_URL;

  async listWorkouts() {
    return this.listAll<HevyWorkout, 'workouts'>('/workouts', 'workouts');
  }

  async listExerciseTemplates() {
    return this.listAll<HevyExerciseTemplate, 'exercise_templates'>(
      '/exercise_templates',
      'exercise_templates',
    );
  }

  async listBodyMeasurements() {
    return this.listAll<HevyBodyMeasurement, 'body_measurements'>(
      '/body_measurements',
      'body_measurements',
    );
  }

  private async listAll<T, K extends string>(path: string, collectionKey: K): Promise<T[]> {
    const apiKey = process.env.HEVY_API_KEY;
    if (!apiKey) {
      throw new HevyApiError('HEVY_API_KEY is not configured. Add it to your local environment.');
    }

    const all: T[] = [];
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount) {
      const url = new URL(`${this.baseUrl}${path}`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      const response: Response = await fetch(url, {
        method: 'GET',
        headers: { 'api-key': apiKey },
      });
      const body: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new HevyApiError(this.messageFor(response.status));
      }
      if (!this.isPaginatedResponse<T, K>(body, collectionKey)) {
        throw new HevyApiError('Hevy returned an unexpected response. Please try again later.');
      }

      all.push(...body[collectionKey]);
      pageCount = body.page_count;
      page += 1;
    }

    return all;
  }

  private isPaginatedResponse<T, K extends string>(
    body: unknown,
    collectionKey: K,
  ): body is PaginatedResponse<T, K> {
    if (!body || typeof body !== 'object') return false;
    const value = body as Record<string, unknown>;
    return (
      typeof value.page === 'number' &&
      Number.isInteger(value.page) &&
      typeof value.page_count === 'number' &&
      Number.isInteger(value.page_count) &&
      value.page_count >= value.page &&
      Array.isArray(value[collectionKey])
    );
  }

  private messageFor(status: number) {
    if (status === 401 || status === 403) {
      return 'Hevy rejected the configured API key. Check HEVY_API_KEY and try again.';
    }
    if (status === 429) return 'Hevy is rate limiting requests. Wait a moment and try again.';
    return 'Hevy could not complete the import. Please try again later.';
  }
}

@Injectable()
export class HevySyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hevyClient: HevyClient,
  ) {}

  async status() {
    return (
      (await this.prisma.syncState.findUnique({ where: { id: 'hevy' } })) ?? {
        id: 'hevy',
        lastSyncedAt: null,
        status: 'never',
        message: null,
      }
    );
  }

  async sync() {
    try {
      const [workouts, templates, measurements] = await Promise.all([
        this.hevyClient.listWorkouts(),
        this.hevyClient.listExerciseTemplates(),
        this.hevyClient.listBodyMeasurements(),
      ]);
      const templateById = new Map(templates.map((template) => [template.id, template]));

      await this.prisma.$transaction(async (tx) => {
        for (const template of templates) {
          await tx.hevyExerciseTemplate.upsert({
            where: { id: template.id },
            create: this.templateData(template),
            update: this.templateData(template),
          });
        }
        for (const measurement of measurements) {
          const date = this.localDate(measurement.date);
          await tx.hevyBodyMeasurement.upsert({
            where: { date },
            create: { date, ...this.measurementData(measurement) },
            update: this.measurementData(measurement),
          });
        }
        for (const workout of workouts) {
          const data = this.workoutData(workout, templateById);
          await tx.workout.upsert({
            where: { id: workout.id },
            create: data,
            update: { ...data, exercises: { deleteMany: {}, create: data.exercises.create } },
          });
        }
      });

      const completedAt = new Date();
      const imported = workouts.length + templates.length + measurements.length;
      const message = `Imported ${workouts.length} workouts, ${templates.length} templates, and ${measurements.length} body measurements.`;
      await this.prisma.syncState.upsert({
        where: { id: 'hevy' },
        create: { id: 'hevy', lastSyncedAt: completedAt, status: 'succeeded', message },
        update: { lastSyncedAt: completedAt, status: 'succeeded', message },
      });
      return { status: 'succeeded', imported, message, syncedAt: completedAt };
    } catch (error) {
      const message =
        error instanceof HevyApiError ? error.message : 'Local Hevy import failed. Try again.';
      await this.prisma.syncState.upsert({
        where: { id: 'hevy' },
        create: { id: 'hevy', status: 'failed', message },
        update: { status: 'failed', message },
      });

      if (error instanceof HevyApiError) throw new ServiceUnavailableException(message);
      throw new BadGatewayException(message);
    }
  }

  private workoutData(workout: HevyWorkout, templateById: Map<string, HevyExerciseTemplate>) {
    return {
      id: workout.id,
      title: workout.title || 'Untitled workout',
      startedAt: new Date(workout.start_time),
      endedAt: workout.end_time ? new Date(workout.end_time) : null,
      raw: workout as Prisma.InputJsonValue,
      exercises: {
        create: (workout.exercises ?? []).map((exercise) => {
          const template = exercise.exercise_template_id
            ? templateById.get(exercise.exercise_template_id)
            : undefined;
          return {
            templateId: exercise.exercise_template_id || null,
            name: exercise.title || template?.title || 'Unknown exercise',
            muscleGroup: template?.primary_muscle_group || null,
            sets: {
              create: (exercise.sets ?? []).map((set, ordinal) => ({
                ordinal,
                weightKg: set.weight_kg ?? null,
                reps: set.reps ?? null,
                rpe: set.rpe ?? null,
              })),
            },
          };
        }),
      },
    };
  }

  private templateData(template: HevyExerciseTemplate) {
    return {
      id: template.id,
      title: template.title,
      type: template.type ?? null,
      primaryMuscleGroup: template.primary_muscle_group ?? null,
      secondaryMuscleGroups: template.secondary_muscle_groups as Prisma.InputJsonValue | undefined,
      isCustom: template.is_custom ?? null,
      raw: template as Prisma.InputJsonValue,
    };
  }

  private measurementData(measurement: HevyBodyMeasurement) {
    return {
      weightKg: measurement.weight_kg ?? null,
      bodyFatPercentage: measurement.body_fat_percentage ?? null,
      chestCm: measurement.chest ?? null,
      waistCm: measurement.waist ?? null,
      hipsCm: measurement.hips ?? null,
      bicepCm: measurement.biceps ?? null,
      raw: measurement as Prisma.InputJsonValue,
    };
  }

  private localDate(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }
}

@Controller('hevy')
export class HevyController {
  constructor(private readonly syncService: HevySyncService) {}

  @Get('status')
  status() {
    return this.syncService.status();
  }

  @Post('sync')
  sync() {
    return this.syncService.sync();
  }
}
