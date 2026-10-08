import { describe, expect, it } from 'vitest';
import { filterMeteorites, formatMass } from './data';
import type { Filters, Meteorite } from './types';

const items: Meteorite[] = [
  {
    id: '1',
    name: 'Allende',
    recclass: 'CV3',
    mass: 2_000_000,
    fall: 'Fell',
    year: 1969,
    lat: 27,
    lon: -105,
  },
  {
    id: '2',
    name: 'Hoba',
    recclass: 'Iron, IVB',
    mass: 60_000_000,
    fall: 'Found',
    year: 1920,
    lat: -19,
    lon: 17,
  },
  { id: '3', name: 'Tiny', recclass: 'L6', mass: null, fall: 'Found', year: null, lat: 1, lon: 1 },
];

const none: Filters = { query: '', fall: 'all', yearFrom: null, yearTo: null, minMassKg: null };
const names = (f: Partial<Filters>) =>
  filterMeteorites(items, { ...none, ...f }).map((m) => m.name);

describe('filterMeteorites', () => {
  it('returns everything with no filters', () => {
    expect(names({})).toEqual(['Allende', 'Hoba', 'Tiny']);
  });

  it('filters by name, fall, year and mass', () => {
    expect(names({ query: 'hob' })).toEqual(['Hoba']);
    expect(names({ fall: 'Fell' })).toEqual(['Allende']);
    expect(names({ yearFrom: 1950 })).toEqual(['Allende']);
    expect(names({ minMassKg: 10_000 })).toEqual(['Hoba']);
  });
});

describe('formatMass', () => {
  it('picks a readable unit', () => {
    expect(formatMass(null)).toBe('Unknown');
    expect(formatMass(500)).toBe('500 g');
    expect(formatMass(2500)).toBe('2.5 kg');
    expect(formatMass(60_000_000)).toBe('60 t');
  });
});
