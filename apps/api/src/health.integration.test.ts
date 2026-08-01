import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://hevy:change-me@localhost:5432/hevy_tracker?schema=public';
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const date = new Date('2026-01-03T00:00:00.000Z');

describe('Task 3 health-entry persistence', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.healthEntry.deleteMany({ where: { date } });
  });

  afterAll(async () => {
    await prisma.healthEntry.deleteMany({ where: { date } });
    await prisma.$disconnect();
  });

  it('creates, upserts, lists, updates, and deletes a daily entry', async () => {
    const created = await prisma.healthEntry.upsert({
      where: { date },
      create: { date, steps: 7000 },
      update: { steps: 7000 },
    });
    const upserted = await prisma.healthEntry.upsert({
      where: { date },
      create: { date, steps: 8000 },
      update: { steps: 8000 },
    });
    expect(upserted.id).toBe(created.id);
    expect(upserted.steps).toBe(8000);

    await expect(prisma.healthEntry.findMany({ where: { date } })).resolves.toHaveLength(1);
    const updated = await prisma.healthEntry.update({
      where: { id: created.id },
      data: { calories: 2500 },
    });
    expect(updated.calories).toBe(2500);

    await prisma.healthEntry.delete({ where: { id: created.id } });
    await expect(prisma.healthEntry.findMany({ where: { date } })).resolves.toHaveLength(0);
  });

  it('keeps body-measurement columns out of the locally mutable health-entry table', async () => {
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'HealthEntry'
    `;
    expect(columns.map((column) => column.column_name)).not.toEqual(
      expect.arrayContaining(['weightKg', 'waistCm', 'chestCm', 'bicepCm']),
    );
  });
});
