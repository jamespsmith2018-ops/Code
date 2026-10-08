import { describe, expect, it } from 'vitest';
import type { UkMeteor, UkmonFilters } from './types';
import {
  fallPointMonths,
  filterUkMeteors,
  formatMass,
  reportUrl,
  showerColors,
  SPORADIC_COLOR,
  trackWeight,
} from './ukmon';

const ev = (id: string, shower: string, mag: number | null): UkMeteor => ({
  id,
  t: `2026-04-${id.slice(6, 8)}T00:00:00Z`,
  shower,
  mag,
  lat1: 53,
  lon1: -1,
  h1: 100,
  lat2: 53.1,
  lon2: -1.1,
  h2: 90,
  vg: 40,
  dur: 0.5,
  stations: ['UK0001', 'UK0002'],
});

const items = [
  ev('20260422_000000_UK', 'LYR', 1),
  ev('20260422_000001_UK', 'LYR', 3),
  ev('20260423_000000_UK', 'spo', -2),
  ev('20260424_000000_UK', 'ETA', null),
];
const none: UkmonFilters = { shower: 'all', maxMag: null, hideSporadic: false, day: null };
const ids = (f: Partial<UkmonFilters>) =>
  filterUkMeteors(items, { ...none, ...f }).map((m) => m.id);

describe('filterUkMeteors', () => {
  it('filters by shower, brightness, sporadic and day', () => {
    expect(ids({})).toHaveLength(4);
    expect(ids({ shower: 'LYR' })).toEqual(['20260422_000000_UK', '20260422_000001_UK']);
    expect(ids({ maxMag: 1 })).toEqual(['20260422_000000_UK', '20260423_000000_UK']);
    expect(ids({ hideSporadic: true })).not.toContain('20260423_000000_UK');
    expect(ids({ day: 24 })).toEqual(['20260424_000000_UK']);
  });
});

describe('showerColors', () => {
  it('greys out sporadics and colours the most common shower first', () => {
    const colors = showerColors(items);
    expect(colors.get('spo')).toBe(SPORADIC_COLOR);
    expect(colors.get('LYR')).toBe('#f97316');
  });
});

describe('helpers', () => {
  it('scales line weight by brightness', () => {
    expect(trackWeight(-5)).toBe(6);
    expect(trackWeight(5)).toBe(1);
  });

  it('builds archive report links', () => {
    expect(reportUrl('20260424_000052.674_UK')).toBe(
      'https://archive.ukmeteors.co.uk/reports/2026/orbits/202604/20260424/20260424_000052.674_UK/index.html',
    );
  });
});

describe('fall points', () => {
  it('lists modelled months newest first', () => {
    expect(fallPointMonths({ '20260501_x': 1, '20260402_y': 1, '20260530_z': 1 })).toEqual([
      '2026-05',
      '2026-04',
    ]);
  });

  it('formats masses', () => {
    expect(formatMass(0.0005)).toBe('0.5 g');
    expect(formatMass(187)).toBe('187 kg');
    expect(formatMass(8_820_000)).toBe('8,820 t');
  });
});
