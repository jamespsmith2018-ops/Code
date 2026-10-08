import { describe, expect, it } from 'vitest';
import { normalizeAll, normalizeRecord, parseCsv } from './normalize.mjs';

describe('normalizeRecord', () => {
  it('normalises a JSON API row', () => {
    expect(
      normalizeRecord({
        name: 'Aachen',
        id: '1',
        recclass: 'L5',
        mass: '21',
        fall: 'Fell',
        year: '1880-01-01T00:00:00.000',
        reclat: '50.775000',
        reclong: '6.083330',
      }),
    ).toEqual({
      id: '1',
      name: 'Aachen',
      recclass: 'L5',
      mass: 21,
      fall: 'Fell',
      year: 1880,
      lat: 50.775,
      lon: 6.08333,
    });
  });

  it('drops rows without usable coordinates', () => {
    expect(normalizeRecord({ id: '2', name: 'X', reclat: '', reclong: '' })).toBeNull();
    expect(normalizeRecord({ id: '3', name: 'Y', reclat: '0', reclong: '0' })).toBeNull();
  });
});

describe('parseCsv', () => {
  it('handles quoted fields and the CSV export column names', () => {
    const csv =
      'name,id,recclass,mass (g),fall,year,reclat,reclong,GeoLocation\r\n' +
      'Aachen,1,L5,21,Fell,01/01/1880 12:00:00 AM,50.775,6.08333,"(50.775, 6.08333)"\r\n';
    const [rec] = normalizeAll(parseCsv(csv));
    expect(rec).toMatchObject({ name: 'Aachen', mass: 21, year: 1880, lat: 50.775 });
  });
});
