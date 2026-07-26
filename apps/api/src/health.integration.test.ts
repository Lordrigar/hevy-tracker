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
      create: { date, weightKg: 80, steps: 7000 },
      update: { weightKg: 80, steps: 7000 },
    });
    const upserted = await prisma.healthEntry.upsert({
      where: { date },
      create: { date, weightKg: 81, steps: 8000 },
      update: { weightKg: 81, steps: 8000 },
    });
    expect(upserted.id).toBe(created.id);
    expect(upserted.weightKg).toBe(81);

    await expect(prisma.healthEntry.findMany({ where: { date } })).resolves.toHaveLength(1);
    const updated = await prisma.healthEntry.update({
      where: { id: created.id },
      data: { waistCm: 82 },
    });
    expect(updated.waistCm).toBe(82);

    await prisma.healthEntry.delete({ where: { id: created.id } });
    await expect(prisma.healthEntry.findMany({ where: { date } })).resolves.toHaveLength(0);
  });
});
