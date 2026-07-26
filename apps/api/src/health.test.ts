import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { HealthController, HealthEntryDto, HealthService } from './health';

describe('HealthEntryDto', () => {
  it('accepts a valid metric health entry', async () => {
    const dto = Object.assign(new HealthEntryDto(), {
      date: '2026-07-26',
      weightKg: 80.2,
      waistCm: 82,
      chestCm: 102,
      bicepCm: 38,
      steps: 8000,
      calories: 2500,
      calorieTarget: 2600,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid measurement and activity bounds', async () => {
    const dto = Object.assign(new HealthEntryDto(), {
      date: 'not-a-date',
      weightKg: 10,
      steps: -1,
      calories: 30000,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['date', 'weightKg', 'steps', 'calories']),
    );
  });
});

describe('HealthService', () => {
  it('upserts entries by their normalized daily date', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'health-entry-id' });
    const service = new HealthService({ healthEntry: { upsert } } as never);

    await expect(service.upsert({ date: '2026-07-26', weightKg: 80.2 })).resolves.toEqual({
      id: 'health-entry-id',
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { date: new Date('2026-07-26T00:00:00.000Z') },
      create: { date: new Date('2026-07-26T00:00:00.000Z'), weightKg: 80.2 },
      update: { weightKg: 80.2 },
    });
  });

  it('returns a compact success result after controller deletion', async () => {
    const remove = vi.fn().mockResolvedValue({ id: 'health-entry-id' });
    const controller = new HealthController({} as never, { remove } as never);

    await expect(controller.remove('health-entry-id')).resolves.toEqual({ success: true });
    expect(remove).toHaveBeenCalledWith('health-entry-id');
  });
});
