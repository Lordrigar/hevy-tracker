import { useMemo, useState } from 'react';
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
import { api, type HealthEntry, type HealthEntryInput, type MuscleGroupAnalytics } from './api';

type FormValues = Record<keyof Omit<HealthEntryInput, 'date'> | 'date', string>;

const initialForm = (): FormValues => ({
  date: new Date().toISOString().slice(0, 10),
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
  { key: 'steps', label: 'Steps', min: 0, max: 200000 },
  { key: 'calories', label: 'Calories', min: 0, max: 20000 },
  { key: 'calorieTarget', label: 'Calorie target', min: 0, max: 20000 },
];

function toFormValues(entry: HealthEntry): FormValues {
  return {
    date: entry.date.slice(0, 10),
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

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateStartOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

function dateStartOfWeek() {
  const date = new Date();
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function dateStartOfMonth() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

function changeLabel(change: number | null | undefined, unit = '') {
  if (change === null || change === undefined) return 'No comparison available';
  return `${change >= 0 ? '+' : ''}${formatNumber(change)}${unit} vs previous period`;
}

type MuscleMetric = 'volumeKg' | 'repCount' | 'setCount';

const metricLabels: Record<MuscleMetric, string> = {
  volumeKg: 'Volume (kg)',
  repCount: 'Reps',
  setCount: 'Sets',
};

function MuscleGroupBars({
  groups,
  metric,
  selected,
  onSelect,
}: {
  groups: MuscleGroupAnalytics[];
  metric: MuscleMetric;
  selected: string | undefined;
  onSelect: (muscleGroup: string) => void;
}) {
  const ranked = [...groups].sort(
    (left, right) =>
      right[metric] - left[metric] || left.muscleGroup.localeCompare(right.muscleGroup),
  );
  const maximum = Math.max(...ranked.map((group) => group[metric]), 1);
  if (groups.length === 0)
    return <Text color="fg.muted">No muscle-group volume in this range.</Text>;
  return (
    <Stack gap="2">
      {ranked.map((group) => (
        <Button
          key={group.muscleGroup}
          aria-pressed={selected === group.muscleGroup}
          justifyContent="stretch"
          onClick={() => onSelect(group.muscleGroup)}
          variant={selected === group.muscleGroup ? 'subtle' : 'ghost'}
        >
          <Stack direction="row" justify="space-between" fontSize="sm">
            <Text>{group.muscleGroup.replace('_', ' ')}</Text>
            <Text>
              {formatNumber(group[metric])}
              {metric === 'volumeKg' ? ' kg' : ''}
            </Text>
          </Stack>
          <Box bg="gray.200" borderRadius="full" h="2" mt="1" overflow="hidden">
            <Box
              aria-label={`${group.muscleGroup}: ${formatNumber(group[metric])} ${metricLabels[metric]}`}
              bg="blue.500"
              h="full"
              title={`${group.muscleGroup}: ${formatNumber(group[metric])} ${metricLabels[metric]}`}
              w={`${(group[metric] / maximum) * 100}%`}
            />
          </Box>
        </Button>
      ))}
    </Stack>
  );
}

export function App() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormValues>(initialForm);
  const [formError, setFormError] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [from, setFrom] = useState(dateOffset(-6));
  const [to, setTo] = useState(dateOffset(0));
  const [exercise, setExercise] = useState('');
  const [muscleMetric, setMuscleMetric] = useState<MuscleMetric>('volumeKg');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>();

  const statusQuery = useQuery({ queryKey: ['api-status'], queryFn: api.status });
  const healthEntriesQuery = useQuery({
    queryKey: ['health-entries'],
    queryFn: api.listHealthEntries,
  });
  const hevyStatusQuery = useQuery({ queryKey: ['hevy-status'], queryFn: api.hevyStatus });
  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', from, to],
    queryFn: () => api.dashboardOverview(from, to),
  });
  const historyQuery = useQuery({
    queryKey: ['workout-history', from, to],
    queryFn: () => api.workoutHistory(from, to),
  });
  const measurementsQuery = useQuery({
    queryKey: ['body-measurements', from, to],
    queryFn: () => api.bodyMeasurements(from, to),
  });
  const trendQuery = useQuery({
    queryKey: ['exercise-trend', from, to, exercise],
    queryFn: () => api.exerciseTrend(from, to, exercise),
    enabled: exercise.trim().length > 0,
  });
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
  const healthInRange = useMemo(
    () =>
      entries.filter((entry) => entry.date.slice(0, 10) >= from && entry.date.slice(0, 10) <= to),
    [entries, from, to],
  );
  const overview = overviewQuery.data?.current ? overviewQuery.data : undefined;
  const selectedMuscleExercises = useMemo(
    () =>
      overview?.current.exercises.filter(
        (item) =>
          item.muscleGroup === selectedMuscleGroup ||
          (item.secondaryMuscleGroups ?? []).includes(selectedMuscleGroup ?? ''),
      ) ?? [],
    [overview, selectedMuscleGroup],
  );
  const exerciseOptions = overview?.current.exercises ?? [];
  const applyRange = (nextFrom: string) => {
    setFrom(nextFrom);
    setTo(dateOffset(0));
  };

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
            </Stack>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Header>
            <Stack direction={{ base: 'column', md: 'row' }} justify="space-between">
              <Box>
                <Heading size="md">Training dashboard</Heading>
              </Box>
              <Stack direction="row" align="end">
                <Stack gap="1">
                  <Text fontSize="sm">Quick range</Text>
                  <Stack direction="row">
                    <Button size="xs" onClick={() => applyRange(dateStartOfWeek())}>
                      This week
                    </Button>
                    <Button size="xs" onClick={() => applyRange(dateStartOfMonth())}>
                      This month
                    </Button>
                    <Button size="xs" onClick={() => applyRange(dateStartOfYear())}>
                      YTD
                    </Button>
                  </Stack>
                </Stack>
                <Box>
                  <label htmlFor="dashboard-from">From</label>
                  <Input
                    id="dashboard-from"
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </Box>
                <Box>
                  <label htmlFor="dashboard-to">To</label>
                  <Input
                    id="dashboard-to"
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </Box>
              </Stack>
            </Stack>
          </Card.Header>
          <Card.Body>
            {overviewQuery.isPending ? (
              <Text color="fg.muted">Loading training analytics…</Text>
            ) : overviewQuery.isError ? (
              <Text color="red.fg">Unable to load training analytics.</Text>
            ) : overview ? (
              <Stack gap="6">
                <SimpleGrid columns={{ base: 2, md: 4 }} gap="3">
                  {[
                    ['Workouts', overview.current.totals.workoutCount, ''],
                    [
                      'Sets',
                      overview.current.totals.setCount,
                      changeLabel(overview.changes.setCount.change),
                    ],
                    ['Reps', overview.current.totals.repCount, ''],
                    [
                      'Volume',
                      `${formatNumber(overview.current.totals.volumeKg)} kg`,
                      changeLabel(overview.changes.volumeKg.change, ' kg'),
                    ],
                  ].map(([label, value, detail]) => (
                    <Card.Root key={String(label)} variant="outline">
                      <Card.Body>
                        <Text color="fg.muted" fontSize="sm">
                          {label}
                        </Text>
                        <Heading size="lg">{value}</Heading>
                        {detail && (
                          <Text color="fg.muted" fontSize="xs">
                            {detail}
                          </Text>
                        )}
                      </Card.Body>
                    </Card.Root>
                  ))}
                </SimpleGrid>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap="6">
                  <Box>
                    <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" mb="3">
                      <Heading size="sm">Muscle groups</Heading>
                      <Stack direction="row" role="group" aria-label="Muscle group metric">
                        {(Object.keys(metricLabels) as MuscleMetric[]).map((metric) => (
                          <Button
                            key={metric}
                            size="xs"
                            variant={muscleMetric === metric ? 'solid' : 'outline'}
                            onClick={() => setMuscleMetric(metric)}
                          >
                            {metricLabels[metric]}
                          </Button>
                        ))}
                      </Stack>
                    </Stack>
                    <Text color="fg.muted" fontSize="xs" mb="3">
                      Bars are relative within the selected metric. Hover a bar for its exact value.
                    </Text>
                    <MuscleGroupBars
                      groups={overview.current.muscleGroups}
                      metric={muscleMetric}
                      onSelect={setSelectedMuscleGroup}
                      selected={selectedMuscleGroup}
                    />
                  </Box>
                  <Box>
                    <Heading size="sm" mb="3">
                      {selectedMuscleGroup ? `${selectedMuscleGroup} exercises` : 'Muscle details'}
                    </Heading>
                    {selectedMuscleGroup ? (
                      selectedMuscleExercises.length ? (
                        <Stack gap="1" mb="6">
                          {selectedMuscleExercises.map((item) => (
                            <Text key={item.exerciseKey} fontSize="sm">
                              {item.exerciseName}: {formatNumber(item.volumeKg)} kg ·{' '}
                              {item.setCount} sets
                            </Text>
                          ))}
                        </Stack>
                      ) : (
                        <Text color="fg.muted" fontSize="sm" mb="6">
                          No imported exercises for this group.
                        </Text>
                      )
                    ) : (
                      <Text color="fg.muted" fontSize="sm" mb="6">
                        Select a ranked group to inspect its imported exercises.
                      </Text>
                    )}
                    <Heading size="sm" mb="3">
                      Exercise progression
                    </Heading>
                    <Input
                      aria-label="Exercise filter"
                      list="dashboard-exercise-options"
                      placeholder="Type an exercise name or template ID"
                      value={exercise}
                      onChange={(event) => setExercise(event.target.value)}
                    />
                    <datalist id="dashboard-exercise-options">
                      {exerciseOptions.map((item) => (
                        <option key={item.exerciseKey} value={item.exerciseName}>
                          {item.exerciseKey}
                        </option>
                      ))}
                    </datalist>
                    <Text color="fg.muted" fontSize="xs" mt="1">
                      Choose an imported exercise or enter its template ID manually.
                    </Text>
                    {exercise ? (
                      trendQuery.isPending ? (
                        <Text mt="3">Loading exercise trend…</Text>
                      ) : trendQuery.isError ? (
                        <Text color="red.fg" mt="3">
                          Unable to load exercise progression.
                        </Text>
                      ) : trendQuery.data?.trend.length ? (
                        trendQuery.data.trend.map((item) => (
                          <Box key={item.exerciseKey} mt="3">
                            <Text fontWeight="medium">{item.exerciseName}</Text>
                            <Text>
                              {formatNumber(item.volumeKg)} kg · {item.setCount} sets · max{' '}
                              {item.maxLoadKg ?? '—'} kg
                            </Text>
                            <Text color="fg.muted" fontSize="sm">
                              High-load PR dates: {item.highLoadPrDates.join(', ') || 'None'}
                            </Text>
                          </Box>
                        ))
                      ) : (
                        <Text color="fg.muted" mt="3">
                          No matching exercise in this range.
                        </Text>
                      )
                    ) : (
                      <Text color="fg.muted" mt="3">
                        Enter an exercise to inspect local progression.
                      </Text>
                    )}
                  </Box>
                </SimpleGrid>
                <Box>
                  <Heading size="sm" mb="3">
                    Hevy-imported measurements
                  </Heading>
                  {measurementsQuery.isPending ? (
                    <Text color="fg.muted">Loading imported measurements…</Text>
                  ) : measurementsQuery.isError ? (
                    <Text color="red.fg">Unable to load imported measurements.</Text>
                  ) : measurementsQuery.data?.length ? (
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Date</Table.ColumnHeader>
                          <Table.ColumnHeader>Weight</Table.ColumnHeader>
                          <Table.ColumnHeader>Waist</Table.ColumnHeader>
                          <Table.ColumnHeader>Chest</Table.ColumnHeader>
                          <Table.ColumnHeader>Bicep</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {measurementsQuery.data.map((measurement) => (
                          <Table.Row key={measurement.date}>
                            <Table.Cell>{measurement.date.slice(0, 10)}</Table.Cell>
                            <Table.Cell>{measurement.weightKg ?? '—'} kg</Table.Cell>
                            <Table.Cell>{measurement.waistCm ?? '—'} cm</Table.Cell>
                            <Table.Cell>{measurement.chestCm ?? '—'} cm</Table.Cell>
                            <Table.Cell>{measurement.bicepCm ?? '—'} cm</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  ) : (
                    <Text color="fg.muted">No Hevy-imported measurements in this range.</Text>
                  )}
                </Box>
                <Box>
                  <Heading size="sm" mb="3">
                    Workout history
                  </Heading>
                  {historyQuery.isPending ? (
                    <Text>Loading workout history…</Text>
                  ) : historyQuery.isError ? (
                    <Text color="red.fg">Unable to load workout history.</Text>
                  ) : historyQuery.data?.length ? (
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Date</Table.ColumnHeader>
                          <Table.ColumnHeader>Workout</Table.ColumnHeader>
                          <Table.ColumnHeader>Exercises</Table.ColumnHeader>
                          <Table.ColumnHeader>Sets</Table.ColumnHeader>
                          <Table.ColumnHeader>Volume</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {historyQuery.data.map((workout) => (
                          <Table.Row key={workout.id}>
                            <Table.Cell>{workout.startedAt.slice(0, 10)}</Table.Cell>
                            <Table.Cell>{workout.title}</Table.Cell>
                            <Table.Cell>{workout.exerciseCount}</Table.Cell>
                            <Table.Cell>{workout.setCount}</Table.Cell>
                            <Table.Cell>{formatNumber(workout.volumeKg)} kg</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  ) : (
                    <Text color="fg.muted">No imported workouts in this range.</Text>
                  )}
                </Box>
                <Box>
                  <Heading size="sm" mb="3">
                    Local steps and calorie trends
                  </Heading>
                  {healthInRange.length ? (
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Date</Table.ColumnHeader>
                          <Table.ColumnHeader>Steps</Table.ColumnHeader>
                          <Table.ColumnHeader>Calories</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {healthInRange.map((entry) => (
                          <Table.Row key={entry.id}>
                            <Table.Cell>{entry.date.slice(0, 10)}</Table.Cell>
                            <Table.Cell>{entry.steps ?? '—'}</Table.Cell>
                            <Table.Cell>{entry.calories ?? '—'}</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  ) : (
                    <Text color="fg.muted">No local health entries in this range.</Text>
                  )}
                </Box>
              </Stack>
            ) : (
              <Text color="red.fg">Unable to load training analytics.</Text>
            )}
          </Card.Body>
          <Card.Footer>
            <Button variant="outline" onClick={() => setAnalysisDialogOpen(true)}>
              Prepare weekly analysis
            </Button>
          </Card.Footer>
        </Card.Root>
        <Card.Root>
          <Card.Header>
            <Heading size="md">Hevy data</Heading>
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
                  {hevyStatusQuery.data?.latestAudit && (
                    <Text color="fg.muted" fontSize="sm">
                      Latest audit ({hevyStatusQuery.data.latestAudit.mode}):{' '}
                      {hevyStatusQuery.data.latestAudit.imported} imported,{' '}
                      {hevyStatusQuery.data.latestAudit.updated} updated,{' '}
                      {hevyStatusQuery.data.latestAudit.deleted} deleted.
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
                <Heading size="md">Steps and calorie history</Heading>
                <Text color="fg.muted" fontSize="sm">
                  Body measurements are imported read-only from Hevy. These local entries store
                  steps and calories only.
                </Text>
              </Box>
              <Button alignSelf="start" colorPalette="blue" onClick={openCreateDialog}>
                Add daily entry
              </Button>
            </Stack>
          </Card.Header>
          <Card.Body overflowX="auto">
            {(loadError || deleteError) && <Box color="red.fg">{loadError || deleteError}</Box>}
            {healthEntriesQuery.isPending ? (
              <Text color="fg.muted">Loading health entries…</Text>
            ) : entries.length === 0 ? (
              <Text color="fg.muted">
                No daily entries yet. Add your first steps or calorie entry above.
              </Text>
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Date</Table.ColumnHeader>
                    <Table.ColumnHeader>Steps</Table.ColumnHeader>
                    <Table.ColumnHeader>Calories</Table.ColumnHeader>
                    <Table.ColumnHeader>Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {entries.map((entry) => (
                    <Table.Row key={entry.id}>
                      <Table.Cell>{entry.date.slice(0, 10)}</Table.Cell>
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
      <Dialog.Root
        open={analysisDialogOpen}
        onOpenChange={(details) => setAnalysisDialogOpen(details.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Prepare weekly analysis</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="3">
                <Text>
                  Selected local range: {from} to {to}.
                </Text>
                <Text color="fg.muted">
                  This confirmation does not call ChatGPT or any model. MCP analysis is added in
                  Task 10 and will remain an explicit user action.
                </Text>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button onClick={() => setAnalysisDialogOpen(false)}>Close</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
