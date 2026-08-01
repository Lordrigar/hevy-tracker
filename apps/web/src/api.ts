const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type HealthEntry = {
  id: string;
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  bicepCm: number | null;
  steps: number | null;
  calories: number | null;
  calorieTarget: number | null;
};

export type HealthEntryInput = {
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  bicepCm?: number;
  steps?: number;
  calories?: number;
  calorieTarget?: number;
};

export type HevySyncStatus = {
  id: string;
  lastSyncedAt: string | null;
  status: 'never' | 'succeeded' | 'failed';
  message: string | null;
  latestAudit: {
    startedAt: string;
    finishedAt: string | null;
    status: string;
    mode: string;
    imported: number;
    updated: number;
    deleted: number;
    message: string | null;
  } | null;
};

export type HevySyncResult = {
  status: 'succeeded';
  mode: 'initial' | 'incremental';
  imported: number;
  updated: number;
  deleted: number;
  message: string;
  syncedAt: string;
};

export type TrainingTotals = {
  workoutCount: number;
  setCount: number;
  repCount: number;
  volumeKg: number;
  averageRpe: number | null;
};

export type ExerciseAnalytics = TrainingTotals & {
  exerciseKey: string;
  exerciseName: string;
  maxLoadKg: number | null;
  highLoadPrDates: string[];
};

export type MuscleGroupAnalytics = {
  muscleGroup: string;
  setCount: number;
  repCount: number;
  volumeKg: number;
};

export type DashboardOverview = {
  current: {
    totals: TrainingTotals;
    exercises: ExerciseAnalytics[];
    muscleGroups: MuscleGroupAnalytics[];
  };
  previous: { totals: TrainingTotals };
  changes: {
    volumeKg: { change: number | null };
    setCount: { change: number | null };
    muscleGroups: Array<
      MuscleGroupAnalytics & { previousVolumeKg: number; volumeChangeKg: number }
    >;
  };
};

export type WorkoutHistoryItem = {
  id: string;
  title: string;
  startedAt: string;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || response.statusText || 'The local API request failed.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  status: () => request<{ status: string; database: string }>('/health/status'),
  listHealthEntries: () => request<HealthEntry[]>('/health'),
  saveHealthEntry: (entry: HealthEntryInput) =>
    request<HealthEntry>('/health', { method: 'POST', body: JSON.stringify(entry) }),
  deleteHealthEntry: (id: string) =>
    request<{ success: boolean }>(`/health/${id}`, { method: 'DELETE' }),
  hevyStatus: () => request<HevySyncStatus>('/hevy/status'),
  syncHevy: () => request<HevySyncResult>('/hevy/sync', { method: 'POST' }),
  dashboardOverview: (from: string, to: string) =>
    request<DashboardOverview>(`/dashboard/overview?from=${from}&to=${to}`),
  workoutHistory: (from: string, to: string) =>
    request<WorkoutHistoryItem[]>(`/dashboard/workout-history?from=${from}&to=${to}`),
  exerciseTrend: (from: string, to: string, exercise: string) =>
    request<{ trend: ExerciseAnalytics[] }>(
      `/dashboard/exercise-trend?from=${from}&to=${to}&exercise=${encodeURIComponent(exercise)}`,
    ),
};
