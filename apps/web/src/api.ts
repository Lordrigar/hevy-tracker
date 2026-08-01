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
};

export type HevySyncResult = {
  status: 'succeeded';
  imported: number;
  message: string;
  syncedAt: string;
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
};
