import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.DATABASE_URL || "postgresql://hevy:change-me@localhost:5432/hevy_tracker?schema=public";
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

describe("Task 2 database schema", () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("creates every required table", async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    const tables = rows.map((row) => row.table_name);
    for (const table of ["HealthEntry", "Workout", "Exercise", "WorkoutSet", "SyncState", "SyncLog", "WeeklyReport"]) {
      expect(tables).toContain(table);
    }
  });

  it("cascades a deleted workout through exercises and sets", async () => {
    const workout = await prisma.workout.create({
      data: {
        id: `task-2-cascade-${crypto.randomUUID()}`,
        title: "Task 2 cascade check",
        startedAt: new Date(),
        raw: { fixture: true },
        exercises: { create: { name: "Fixture exercise", sets: { create: { ordinal: 0, weightKg: 50, reps: 5 } } } }
      },
      include: { exercises: { include: { sets: true } } }
    });
    const setId = workout.exercises[0].sets[0].id;

    await prisma.workout.delete({ where: { id: workout.id } });
    await expect(prisma.workoutSet.count({ where: { id: setId } })).resolves.toBe(0);
  });
});
