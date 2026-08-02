CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "folderId" TEXT,
    "folder" TEXT,
    "notes" TEXT,
    "raw" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoutineExercise" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "supersetId" TEXT,
    "restSeconds" INTEGER,
    "notes" TEXT,
    "raw" JSONB NOT NULL,
    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoutineSet" (
    "id" TEXT NOT NULL,
    "routineExerciseId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "type" TEXT,
    "weightKg" DOUBLE PRECISION,
    "reps" INTEGER,
    "rpe" DOUBLE PRECISION,
    CONSTRAINT "RoutineSet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoutineExercise_routineId_ordinal_key" ON "RoutineExercise"("routineId", "ordinal");
CREATE INDEX "RoutineExercise_templateId_idx" ON "RoutineExercise"("templateId");
CREATE UNIQUE INDEX "RoutineSet_routineExerciseId_ordinal_key" ON "RoutineSet"("routineExerciseId", "ordinal");
CREATE INDEX "Routine_folderId_idx" ON "Routine"("folderId");

ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoutineSet" ADD CONSTRAINT "RoutineSet_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
