import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const entry = {
  id: 'health-entry-id',
  date: '2026-07-26T00:00:00.000Z',
  weightKg: 80.2,
  waistCm: 82,
  chestCm: null,
  bicepCm: null,
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
      await screen.findByText('No health entries yet. Add your first daily entry above.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Weight (kg)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add health entry' }));
    expect(screen.getByLabelText('Weight (kg)')).toBeInTheDocument();
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

    expect(await screen.findByText('80.2 kg')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(80.2);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-26');
  });

  it('shows client validation feedback before saving an invalid entry', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('No health entries yet. Add your first daily entry above.');
    await user.click(screen.getByRole('button', { name: 'Add health entry' }));

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
});
