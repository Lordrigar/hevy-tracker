-- CreateTable
CREATE TABLE "HevyExerciseTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "primaryMuscleGroup" TEXT,
    "secondaryMuscleGroups" JSONB,
    "isCustom" BOOLEAN,
    "raw" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HevyExerciseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HevyBodyMeasurement" (
    "date" DATE NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercentage" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "bicepCm" DOUBLE PRECISION,
    "raw" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HevyBodyMeasurement_pkey" PRIMARY KEY ("date")
);
