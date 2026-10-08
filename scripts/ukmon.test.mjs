import { describe, expect, it } from 'vitest';
import { compactEvent, orbnameToIso } from './ukmon.mjs';

describe('orbnameToIso', () => {
  it('parses the event id timestamp', () => {
    expect(orbnameToIso('20260424_000052.674_UK')).toBe('2026-04-24T00:00:52.674Z');
    expect(orbnameToIso('garbage')).toBeNull();
  });
});

describe('compactEvent', () => {
  it('keeps the fields the map needs', () => {
    expect(
      compactEvent({
        orbname: '20260424_000052.674_UK',
        _stream: 'LYR',
        name: 'April Lyrids   ',
        _mag: 2.5,
        _lat1: 53.80031,
        _lng1: -1.085612,
        _H1: 106.793,
        _lat2: 53.7614,
        _lng2: -1.1955,
        _H2: 101.669,
        _vg: 41.9218,
        _dur: 0.320812,
        stations: 'UK000Y;UK00A3;',
      }),
    ).toEqual({
      id: '20260424_000052.674_UK',
      t: '2026-04-24T00:00:52.674Z',
      shower: 'LYR',
      mag: 2.5,
      lat1: 53.8003,
      lon1: -1.0856,
      h1: 106.8,
      lat2: 53.7614,
      lon2: -1.1955,
      h2: 101.7,
      vg: 41.9,
      dur: 0.32,
      stations: ['UK000Y', 'UK00A3'],
    });
  });

  it('drops events without a track', () => {
    expect(compactEvent({ orbname: '20260424_000052.674_UK' })).toBeNull();
  });
});
