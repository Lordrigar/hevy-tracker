UPDATE "WorkoutSet" AS workout_set
SET "isWarmup" = true
FROM "Exercise" AS exercise
JOIN "Workout" AS workout ON workout.id = exercise."workoutId"
WHERE workout_set."exerciseId" = exercise.id
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(workout.raw -> 'exercises') AS imported_exercise
    WHERE COALESCE(imported_exercise ->> 'exercise_template_id', '') = COALESCE(exercise."templateId", '')
      AND imported_exercise -> 'sets' -> workout_set.ordinal ->> 'type' = 'warmup'
  );
