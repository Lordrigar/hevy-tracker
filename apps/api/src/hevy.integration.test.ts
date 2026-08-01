import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://hevy:change-me@localhost:5432/hevy_tracker?schema=public';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const fixtureTemplateId = 'task-005-fixture-template';
const fixtureMeasurementDate = new Date('2026-08-01T00:00:00.000Z');
const fixtureSyncLogMessage = 'Task 6 fixture audit';

describe('Task 5 Hevy import persistence', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.hevyExerciseTemplate.deleteMany({ where: { id: fixtureTemplateId } });
    await prisma.hevyBodyMeasurement.deleteMany({ where: { date: fixtureMeasurementDate } });
    await prisma.syncLog.deleteMany({ where: { message: fixtureSyncLogMessage } });
  });

  afterAll(async () => {
    await prisma.hevyExerciseTemplate.deleteMany({ where: { id: fixtureTemplateId } });
    await prisma.hevyBodyMeasurement.deleteMany({ where: { date: fixtureMeasurementDate } });
    await prisma.syncLog.deleteMany({ where: { message: fixtureSyncLogMessage } });
    await prisma.$disconnect();
  });

  it('upserts normalized template and body-measurement data without using health entries', async () => {
    const template = await prisma.hevyExerciseTemplate.upsert({
      where: { id: fixtureTemplateId },
      create: {
        id: fixtureTemplateId,
        title: 'Fixture Bench Press',
        primaryMuscleGroup: 'chest',
        secondaryMuscleGroups: ['triceps'],
        raw: { id: fixtureTemplateId },
      },
      update: { title: 'Fixture Bench Press' },
    });
    const measurement = await prisma.hevyBodyMeasurement.upsert({
      where: { date: fixtureMeasurementDate },
      create: {
        date: fixtureMeasurementDate,
        weightKg: 80.4,
        bodyFatPercentage: 18.2,
        raw: { date: '2026-08-01', weight_kg: 80.4 },
      },
      update: { weightKg: 80.4 },
    });

    expect(template.primaryMuscleGroup).toBe('chest');
    expect(measurement.weightKg).toBe(80.4);
    await expect(
      prisma.healthEntry.findMany({ where: { date: fixtureMeasurementDate } }),
    ).resolves.toHaveLength(0);
  });
});

describe('Task 6 sync audit persistence', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.syncLog.deleteMany({ where: { message: fixtureSyncLogMessage } });
  });

  afterAll(async () => {
    await prisma.syncLog.deleteMany({ where: { message: fixtureSyncLogMessage } });
    await prisma.$disconnect();
  });

  it('records successful incremental reconciliation counts', async () => {
    const audit = await prisma.syncLog.create({
      data: {
        status: 'succeeded',
        mode: 'incremental',
        imported: 0,
        updated: 1,
        deleted: 1,
        finishedAt: new Date(),
        message: fixtureSyncLogMessage,
      },
    });

    expect(audit).toMatchObject({
      status: 'succeeded',
      mode: 'incremental',
      updated: 1,
      deleted: 1,
    });
  });
});
