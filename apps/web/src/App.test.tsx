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
});
