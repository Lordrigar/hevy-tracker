import {
  BadGatewayException,
  Controller,
  Get,
  Injectable,
  Logger,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HevyApiError, HevyClient, type HevyRoutine } from './hevy';
import { PrismaService } from './prisma.service';

type RoutineFacts = {
  plannedExerciseCount: number;
  muscleGroups: Array<{ muscleGroup: string; directSets: number; indirectSets: number }>;
  duplicateExercises: string[];
  unknownTemplateExercises: string[];
};

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hevy: HevyClient,
  ) {}

  async sync() {
    try {
      const [summaries, folders] = await Promise.all([
        this.hevy.listRoutines(),
        this.hevy.listRoutineFolders(),
      ]);
      this.logger.log(
        `Routine sync retrieved ${summaries.length} routine summaries and ${folders.length} folders.`,
      );
      const folderNames = new Map(
        folders.map((folder) => [String(folder.id), folder.title || folder.name || null]),
      );
      const routines = await Promise.all(
        summaries.map((routine) => this.hevy.getRoutine(routine.id)),
      );
      this.logger.log(
        `Routine sync retrieved ${routines.length} routine details; storing locally.`,
      );
      await this.prisma.$transaction(async (tx) => {
        for (const routine of routines) await this.upsert(tx, routine, folderNames);
      });
      return {
        status: 'succeeded' as const,
        imported: routines.length,
        message: `Imported ${routines.length} routines.`,
      };
    } catch (error) {
      const message =
        error instanceof HevyApiError ? error.message : 'Local routine import failed. Try again.';
      this.logger.error(`Routine sync failed: ${safeErrorDetail(error)}`);
      if (error instanceof HevyApiError) throw new ServiceUnavailableException(message);
      throw new BadGatewayException(message);
    }
  }

  async list() {
    const routines = await this.prisma.routine.findMany({
      include: { exercises: { include: { sets: true } } },
      orderBy: [{ ordinal: 'asc' }, { title: 'asc' }],
    });
    const templates = await this.templates();
    return routines.map((routine) => ({
      id: routine.id,
      title: routine.title,
      folder: routine.folder,
      facts: this.facts(routine.exercises, templates),
    }));
  }

  async get(id: string) {
    const routine = await this.prisma.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { sets: { orderBy: { ordinal: 'asc' } } },
          orderBy: { ordinal: 'asc' },
        },
      },
    });
    if (!routine) throw new NotFoundException('Routine not found.');
    const templates = await this.templates();
    return { ...routine, facts: this.facts(routine.exercises, templates) };
  }

  private async templates() {
    return new Map(
      (await this.prisma.hevyExerciseTemplate.findMany()).map((template) => [
        template.id,
        template,
      ]),
    );
  }

  private async upsert(
    tx: Prisma.TransactionClient,
    routine: HevyRoutine,
    folderNames: Map<string, string | null>,
  ) {
    const data = {
      title: routine.title || 'Untitled routine',
      ordinal: routine.index ?? 0,
      folderId:
        routine.folder_id === null || routine.folder_id === undefined
          ? null
          : String(routine.folder_id),
      folder:
        routine.folder_id === null || routine.folder_id === undefined
          ? null
          : folderNames.get(String(routine.folder_id)) || null,
      notes: routine.notes || null,
      raw: routine as Prisma.InputJsonValue,
      exercises: {
        create: (routine.exercises || []).map((exercise, ordinal) => ({
          templateId: exercise.exercise_template_id || null,
          name: exercise.title || 'Unknown exercise',
          ordinal,
          supersetId: exercise.superset_id || null,
          restSeconds: exercise.rest_seconds || null,
          notes: exercise.notes || null,
          raw: exercise as Prisma.InputJsonValue,
          sets: {
            create: (exercise.sets || []).map((set, setOrdinal) => ({
              ordinal: setOrdinal,
              type: set.type || null,
              weightKg: set.weight_kg ?? null,
              reps: set.reps ?? null,
              rpe: set.rpe ?? null,
            })),
          },
        })),
      },
    };
    await tx.routine.upsert({
      where: { id: routine.id },
      create: { id: routine.id, ...data },
      update: { ...data, exercises: { deleteMany: {}, create: data.exercises.create } },
    });
  }

  private facts(
    exercises: Array<{
      templateId: string | null;
      name: string;
      sets: Array<{ type: string | null }>;
    }>,
    templates: Map<string, { primaryMuscleGroup: string | null; secondaryMuscleGroups: unknown }>,
  ): RoutineFacts {
    const muscles = new Map<string, { directSets: number; indirectSets: number }>();
    const names = new Map<string, number>();
    const unknown: string[] = [];
    for (const exercise of exercises) {
      const name = exercise.name.trim();
      names.set(name, (names.get(name) || 0) + 1);
      const template = exercise.templateId ? templates.get(exercise.templateId) : undefined;
      if (!template) {
        unknown.push(name);
        continue;
      }
      const sets = exercise.sets.filter((set) => set.type !== 'warmup').length;
      if (template.primaryMuscleGroup) {
        const entry = muscles.get(template.primaryMuscleGroup) || {
          directSets: 0,
          indirectSets: 0,
        };
        entry.directSets += sets;
        muscles.set(template.primaryMuscleGroup, entry);
      }
      const secondary = Array.isArray(template.secondaryMuscleGroups)
        ? template.secondaryMuscleGroups.filter(
            (group): group is string => typeof group === 'string',
          )
        : [];
      for (const group of secondary) {
        const entry = muscles.get(group) || { directSets: 0, indirectSets: 0 };
        entry.indirectSets += sets * 0.5;
        muscles.set(group, entry);
      }
    }
    return {
      plannedExerciseCount: exercises.length,
      muscleGroups: [...muscles]
        .map(([muscleGroup, values]) => ({ muscleGroup, ...values }))
        .sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup)),
      duplicateExercises: [...names].filter(([, count]) => count > 1).map(([name]) => name),
      unknownTemplateExercises: [...new Set(unknown)],
    };
  }
}

function safeErrorDetail(error: unknown) {
  if (error instanceof HevyApiError) return error.message;
  if (error instanceof Error) {
    const argument = error.message.match(/Argument `[^`]+`: [^.]+\./)?.[0];
    return argument || error.name;
  }
  return 'Unknown non-error failure';
}

@Controller('hevy')
export class RoutineSyncController {
  constructor(private readonly routines: RoutineService) {}
  @Post('sync-routines') sync() {
    return this.routines.sync();
  }
}

@Controller('routines')
export class RoutinesController {
  constructor(private readonly routines: RoutineService) {}
  @Get() list() {
    return this.routines.list();
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.routines.get(id);
  }
}
