import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const entry = {
  id: 'health-entry-id',
  date: '2026-07-26T00:00:00.000Z',
  steps: 8000,
  calories: 2500,
  calorieTarget: 2600,
};

const overview = {
  current: {
    totals: {
      workoutCount: 2,
      setCount: 6,
      repCount: 48,
      volumeKg: 1200,
      bodyweightCoverage: {
        setCount: 0,
        setsWithBodyWeight: 0,
        setsWithoutBodyWeight: 0,
        effectiveVolumeKg: 0,
        externalLoadOnlyVolumeKg: 0,
      },
    },
    exercises: [
      {
        exerciseKey: 'bench',
        exerciseName: 'Bench Press',
        muscleGroup: 'chest',
        setCount: 3,
        volumeKg: 900,
        maxLoadKg: 80,
        highLoadPrDates: ['2026-07-26'],
        bodyweightCoverage: {
          setCount: 0,
          setsWithBodyWeight: 0,
          setsWithoutBodyWeight: 0,
          effectiveVolumeKg: 0,
          externalLoadOnlyVolumeKg: 0,
        },
      },
      {
        exerciseKey: 'row',
        exerciseName: 'Cable Row',
        muscleGroup: 'back',
        secondaryMuscleGroups: ['chest'],
        setCount: 3,
        volumeKg: 300,
        maxLoadKg: 50,
        highLoadPrDates: [],
        bodyweightCoverage: {
          setCount: 0,
          setsWithBodyWeight: 0,
          setsWithoutBodyWeight: 0,
          effectiveVolumeKg: 0,
          externalLoadOnlyVolumeKg: 0,
        },
      },
    ],
    muscleGroups: [
      { muscleGroup: 'chest', setCount: 3, repCount: 24, volumeKg: 900 },
      { muscleGroup: 'back', setCount: 3, repCount: 24, volumeKg: 300 },
    ],
  },
  previous: { totals: {} },
  changes: { volumeKg: { change: 100 }, setCount: { change: 1 }, muscleGroups: [] },
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, statusText: 'Request failed', json: () => Promise.resolve(body) });
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>
        <App />
      </ChakraProvider>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/health/status')) {
          return response({ status: 'ok', database: 'connected' });
        }
        return response([]);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens the health-entry modal from the empty history state', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(
      await screen.findByText('No daily entries yet. Add your first steps or calorie entry above.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Steps')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add daily entry' }));
    expect(screen.getByLabelText('Steps')).toBeInTheDocument();
    expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument();
  });

  it('opens a populated health-entry modal for editing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/health/status')
          ? response({ status: 'ok', database: 'connected' })
          : response([entry]),
      ),
    );
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText('8000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Steps')).toHaveValue(8000);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-26');
  });

  it('shows client validation feedback before saving an invalid entry', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('No daily entries yet. Add your first steps or calorie entry above.');
    await user.click(screen.getByRole('button', { name: 'Add daily entry' }));

    await user.clear(screen.getByLabelText('Date'));
    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    expect(screen.getByText('Date is required.')).toBeInTheDocument();
  });

  it('shows an API error when the history request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/health/status')
          ? response({ status: 'ok', database: 'connected' })
          : response({ message: 'Database unavailable' }, false),
      ),
    );
    renderApp();

    await waitFor(() => expect(screen.getByText('Database unavailable')).toBeInTheDocument());
  });

  it('contacts Hevy only after the user explicitly requests a sync', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/hevy/sync')) {
        expect(init?.method).toBe('POST');
        return response({
          status: 'succeeded',
          imported: 3,
          message: 'Imported fixture data.',
          syncedAt: '2026-08-01T10:00:00.000Z',
        });
      }
      if (url.endsWith('/health/status')) return response({ status: 'ok', database: 'connected' });
      if (url.endsWith('/hevy/status')) {
        return response({ id: 'hevy', status: 'never', lastSyncedAt: null, message: null });
      }
      return response([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('No Hevy import has been run yet.');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/hevy/sync'))).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Sync Hevy data' }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/hevy/sync'))).toBe(true);
    });
  });

  it('generates a weekly report only after confirmation and displays the persisted facts', async () => {
    const report = {
      weekStart: '2026-07-20',
      weekEnd: '2026-07-26',
      generatedAt: '2026-07-27T10:00:00.000Z',
      totals: { workoutCount: 2, setCount: 6, repCount: 48, volumeKg: 1200, averageRpe: 8 },
      changes: { workoutCount: 1, setCount: 2, repCount: 12, volumeKg: 400 },
      prs: [],
      strengthChanges: [
        {
          exerciseKey: 'bench',
          exerciseName: 'Bench Press',
          currentMaxLoadKg: 80,
          previousMaxLoadKg: 75,
          changeKg: 5,
        },
      ],
      muscleGroupVolumeDeltas: [
        { muscleGroup: 'chest', currentVolumeKg: 900, previousVolumeKg: 500, changeKg: 400 },
      ],
    };
    let generated = false;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith('/health/status')) return response({ status: 'ok', database: 'connected' });
      if (url.includes('/dashboard/weekly-report')) {
        if (init?.method === 'POST') generated = true;
        return response(generated ? report : null);
      }
      return response([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText('No weekly report has been generated yet.')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).includes('/dashboard/weekly-report') && init?.method === 'POST',
      ),
    ).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Prepare weekly analysis' }));
    expect(screen.getByText(/Generate a rolling local report/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate weekly report' }));

    expect(await screen.findByRole('columnheader', { name: 'Current best' })).toBeInTheDocument();
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('+5 kg')).toBeInTheDocument();
    expect(screen.getByLabelText('chest current week: 900 kg')).toBeInTheDocument();
  });

  it('supports range presets, ranked muscle details, autocomplete, and imported measurements', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/health/status'))
          return response({ status: 'ok', database: 'connected' });
        if (url.includes('/dashboard/overview')) return response(overview);
        if (url.includes('/dashboard/workout-history')) return response([]);
        if (url.includes('/dashboard/measurements'))
          return response([
            {
              date: '2026-07-26T00:00:00.000Z',
              weightKg: 80,
              waistCm: 82,
              chestCm: 100,
              bicepCm: 38,
            },
          ]);
        if (url.includes('/dashboard/exercise-trend'))
          return response({ trend: [overview.current.exercises[0]] });
        if (url.includes('/dashboard/weekly-report')) return response(null);
        if (url.endsWith('/hevy/status'))
          return response({ id: 'hevy', status: 'never', lastSyncedAt: null, message: null });
        return response([]);
      }),
    );
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText('Hevy-imported measurements')).toBeInTheDocument();
    expect(screen.getByText('80 kg')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'This month' }));
    expect(screen.getByLabelText('From')).toHaveValue(`${new Date().toISOString().slice(0, 8)}01`);
    await user.click(screen.getByRole('button', { name: /chest/i }));
    expect(await screen.findByText(/Bench Press: 900 kg/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Direct work' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Indirect work' })).toBeInTheDocument();
    expect(screen.getByText(/Cable Row: 300 kg/)).toBeInTheDocument();
    await user.type(screen.getByRole('combobox', { name: 'Exercise filter' }), 'Bench Press');
    expect(await screen.findByText('High-load PR dates: 2026-07-26')).toBeInTheDocument();
  });
});
