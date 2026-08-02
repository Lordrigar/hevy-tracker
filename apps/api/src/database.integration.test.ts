import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://hevy:change-me@localhost:5432/hevy_tracker?schema=public';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

describe('Task 2 database schema', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates every required table', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    const tables = rows.map((row) => row.table_name);
    for (const table of [
      'HealthEntry',
      'Workout',
      'Exercise',
      'WorkoutSet',
      'SyncState',
      'SyncLog',
      'WeeklyReport',
      'Routine',
      'RoutineExercise',
      'RoutineSet',
    ]) {
      expect(tables).toContain(table);
    }
  });

  it('cascades a deleted workout through exercises and sets', async () => {
    const workout = await prisma.workout.create({
      data: {
        id: `task-2-cascade-${crypto.randomUUID()}`,
        title: 'Task 2 cascade check',
        startedAt: new Date(),
        raw: { fixture: true },
        exercises: {
          create: {
            name: 'Fixture exercise',
            sets: { create: { ordinal: 0, weightKg: 50, reps: 5 } },
          },
        },
      },
      include: { exercises: { include: { sets: true } } },
    });
    const setId = workout.exercises[0].sets[0].id;

    await prisma.workout.delete({ where: { id: workout.id } });
    await expect(prisma.workoutSet.count({ where: { id: setId } })).resolves.toBe(0);
  });
});

describe('Task 009a routine persistence', () => {
  const routineId = 'task-009a-fixture-routine';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.routine.deleteMany({ where: { id: routineId } });
  });

  afterAll(async () => {
    await prisma.routine.deleteMany({ where: { id: routineId } });
    await prisma.$disconnect();
  });

  it('upserts a normalized routine and replaces nested planned exercises without duplication', async () => {
    const data = {
      title: 'Fixture routine',
      raw: { id: routineId },
      exercises: {
        create: {
          name: 'Fixture Bench Press',
          ordinal: 0,
          raw: { title: 'Fixture Bench Press' },
          sets: { create: { ordinal: 0, reps: 8, weightKg: 80 } },
        },
      },
    };
    for (const title of ['Fixture routine', 'Updated fixture routine']) {
      await prisma.routine.upsert({
        where: { id: routineId },
        create: { id: routineId, ...data, title },
        update: { title, exercises: { deleteMany: {}, create: data.exercises.create } },
      });
    }
    const routine = await prisma.routine.findUnique({
      where: { id: routineId },
      include: { exercises: { include: { sets: true } } },
    });
    expect(routine).toMatchObject({ title: 'Updated fixture routine' });
    expect(routine?.exercises).toHaveLength(1);
    expect(routine?.exercises[0].sets).toHaveLength(1);
  });
});
