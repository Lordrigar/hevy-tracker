import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Heading,
  Input,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type HealthEntry, type HealthEntryInput } from './api';

type FormValues = Record<keyof Omit<HealthEntryInput, 'date'> | 'date', string>;

const initialForm = (): FormValues => ({
  date: new Date().toISOString().slice(0, 10),
  weightKg: '',
  waistCm: '',
  chestCm: '',
  bicepCm: '',
  steps: '',
  calories: '',
  calorieTarget: '',
});

const numberFields: {
  key: Exclude<keyof FormValues, 'date'>;
  label: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  { key: 'weightKg', label: 'Weight (kg)', min: 20, max: 400, step: 0.1 },
  { key: 'waistCm', label: 'Waist (cm)', min: 20, max: 300, step: 0.1 },
  { key: 'chestCm', label: 'Chest (cm)', min: 20, max: 300, step: 0.1 },
  { key: 'bicepCm', label: 'Bicep (cm)', min: 10, max: 100, step: 0.1 },
  { key: 'steps', label: 'Steps', min: 0, max: 200000 },
  { key: 'calories', label: 'Calories', min: 0, max: 20000 },
  { key: 'calorieTarget', label: 'Calorie target', min: 0, max: 20000 },
];

function toFormValues(entry: HealthEntry): FormValues {
  return {
    date: entry.date.slice(0, 10),
    weightKg: entry.weightKg?.toString() ?? '',
    waistCm: entry.waistCm?.toString() ?? '',
    chestCm: entry.chestCm?.toString() ?? '',
    bicepCm: entry.bicepCm?.toString() ?? '',
    steps: entry.steps?.toString() ?? '',
    calories: entry.calories?.toString() ?? '',
    calorieTarget: entry.calorieTarget?.toString() ?? '',
  };
}

function validate(values: FormValues) {
  if (!values.date) return 'Date is required.';
  for (const field of numberFields) {
    const value = values[field.key];
    if (value !== '' && (Number(value) < field.min || Number(value) > field.max)) {
      return `${field.label} must be between ${field.min} and ${field.max}.`;
    }
  }
  return undefined;
}

function toInput(values: FormValues): HealthEntryInput {
  const entry: HealthEntryInput = { date: values.date };
  for (const field of numberFields) {
    const value = values[field.key];
    if (value !== '') entry[field.key] = Number(value) as never;
  }
  return entry;
}

export function App() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormValues>(initialForm);
  const [formError, setFormError] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusQuery = useQuery({ queryKey: ['api-status'], queryFn: api.status });
  const healthEntriesQuery = useQuery({
    queryKey: ['health-entries'],
    queryFn: api.listHealthEntries,
  });
  const hevyStatusQuery = useQuery({ queryKey: ['hevy-status'], queryFn: api.hevyStatus });
  const saveEntry = useMutation({
    mutationFn: api.saveHealthEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['health-entries'] });
      closeDialog();
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Unable to save health entry.');
    },
  });
  const deleteEntry = useMutation({
    mutationFn: api.deleteHealthEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['health-entries'] });
    },
  });
  const syncHevy = useMutation({
    mutationFn: api.syncHevy,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hevy-status'] });
    },
  });

  const state = statusQuery.isPending
    ? 'checking'
    : statusQuery.isSuccess
      ? 'connected'
      : 'unavailable';
  const color = state === 'connected' ? 'green' : state === 'unavailable' ? 'red' : 'yellow';

  function closeDialog() {
    setDialogOpen(false);
    setForm(initialForm());
    setFormError(undefined);
  }

  function openCreateDialog() {
    setForm(initialForm());
    setFormError(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(entry: HealthEntry) {
    setForm(toFormValues(entry));
    setFormError(undefined);
    setDialogOpen(true);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    saveEntry.mutate(toInput(form));
  }

  const entries = healthEntriesQuery.data ?? [];
  const loadError =
    healthEntriesQuery.error instanceof Error ? healthEntriesQuery.error.message : undefined;
  const deleteError = deleteEntry.error instanceof Error ? deleteEntry.error.message : undefined;

  return (
    <Box bg="bg.subtle" minH="100vh" p={{ base: 6, md: 12 }}>
      <Stack maxW="1100px" mx="auto" gap="6">
        <Box>
          <Heading>Hevy Tracker</Heading>
          <Text color="fg.muted">Local training analytics — project foundation</Text>
        </Box>
        <Card.Root>
          <Card.Body>
            <Stack gap="3">
              <Text fontWeight="medium">API connection</Text>
              <Badge alignSelf="start" colorPalette={color}>
                {state}
              </Badge>
              <Text color="fg.muted" fontSize="sm">
                The dashboard only checks the local API health endpoint. It does not sync Hevy or
                run analysis automatically.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Header>
            <Heading size="md">Hevy data</Heading>
            <Text color="fg.muted" fontSize="sm">
              Hevy is contacted only when you click the button below. No data is synced in the
              background.
            </Text>
          </Card.Header>
          <Card.Body>
            <Stack align="start" gap="3">
              {hevyStatusQuery.isPending ? (
                <Text color="fg.muted">Checking local sync status…</Text>
              ) : hevyStatusQuery.isError ? (
                <Text color="red.fg">Unable to load the local Hevy sync status.</Text>
              ) : (
                <>
                  <Badge colorPalette={hevyStatusQuery.data?.status === 'failed' ? 'red' : 'blue'}>
                    {hevyStatusQuery.data?.status ?? 'never'}
                  </Badge>
                  <Text color="fg.muted" fontSize="sm">
                    {hevyStatusQuery.data?.lastSyncedAt
                      ? `Last synced: ${new Date(hevyStatusQuery.data.lastSyncedAt).toLocaleString()}`
                      : 'No Hevy import has been run yet.'}
                  </Text>
                  {hevyStatusQuery.data?.message && (
                    <Text color="fg.muted" fontSize="sm">
                      {hevyStatusQuery.data.message}
                    </Text>
                  )}
                </>
              )}
              {syncHevy.isError && (
                <Text color="red.fg">
                  {syncHevy.error instanceof Error
                    ? syncHevy.error.message
                    : 'Unable to import Hevy data.'}
                </Text>
              )}
              <Button
                colorPalette="blue"
                loading={syncHevy.isPending}
                onClick={() => syncHevy.mutate()}
              >
                Sync Hevy data
              </Button>
            </Stack>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Header>
            <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between">
              <Box>
                <Heading size="md">Health history</Heading>
                <Text color="fg.muted" fontSize="sm">
                  Entries are stored locally. Saving does not sync Hevy or start an AI analysis.
                </Text>
              </Box>
              <Button alignSelf="start" colorPalette="blue" onClick={openCreateDialog}>
                Add health entry
              </Button>
            </Stack>
          </Card.Header>
          <Card.Body overflowX="auto">
            {(loadError || deleteError) && <Box color="red.fg">{loadError || deleteError}</Box>}
            {healthEntriesQuery.isPending ? (
              <Text color="fg.muted">Loading health entries…</Text>
            ) : entries.length === 0 ? (
              <Text color="fg.muted">No health entries yet. Add your first daily entry above.</Text>
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Date</Table.ColumnHeader>
                    <Table.ColumnHeader>Weight</Table.ColumnHeader>
                    <Table.ColumnHeader>Waist</Table.ColumnHeader>
                    <Table.ColumnHeader>Steps</Table.ColumnHeader>
                    <Table.ColumnHeader>Calories</Table.ColumnHeader>
                    <Table.ColumnHeader>Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {entries.map((entry) => (
                    <Table.Row key={entry.id}>
                      <Table.Cell>{entry.date.slice(0, 10)}</Table.Cell>
                      <Table.Cell>{entry.weightKg ?? '—'} kg</Table.Cell>
                      <Table.Cell>{entry.waistCm ?? '—'} cm</Table.Cell>
                      <Table.Cell>{entry.steps ?? '—'}</Table.Cell>
                      <Table.Cell>{entry.calories ?? '—'}</Table.Cell>
                      <Table.Cell>
                        <Stack direction="row">
                          <Button size="xs" variant="outline" onClick={() => openEditDialog(entry)}>
                            Edit
                          </Button>
                          <Button
                            colorPalette="red"
                            loading={deleteEntry.isPending && deleteEntry.variables === entry.id}
                            onClick={() => deleteEntry.mutate(entry.id)}
                            size="xs"
                            variant="ghost"
                          >
                            Delete
                          </Button>
                        </Stack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Body>
        </Card.Root>
      </Stack>

      <Dialog.Root
        open={dialogOpen}
        onOpenChange={(details) => {
          if (!details.open) closeDialog();
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form noValidate onSubmit={save}>
              <Dialog.Header>
                <Dialog.Title>
                  {form.date ? `Health entry for ${form.date}` : 'Health entry'}
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <Box>
                    <label htmlFor="date">Date</label>
                    <Input
                      id="date"
                      mt="1"
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm({ ...form, date: event.target.value })}
                    />
                  </Box>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                    {numberFields.map((field) => (
                      <Box key={field.key}>
                        <label htmlFor={field.key}>{field.label}</label>
                        <Input
                          id={field.key}
                          mt="1"
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={form[field.key]}
                          onChange={(event) =>
                            setForm({ ...form, [field.key]: event.target.value })
                          }
                        />
                      </Box>
                    ))}
                  </SimpleGrid>
                  {formError && <Box color="red.fg">{formError}</Box>}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button colorPalette="blue" loading={saveEntry.isPending} type="submit">
                  Save entry
                </Button>
              </Dialog.Footer>
            </form>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
