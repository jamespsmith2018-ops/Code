import './style.css';
import { filterMeteorites, formatMass, loadMeteorites } from './data';
import { createMap } from './map';
import type { Filters, Meteorite } from './types';

const statsEl = document.querySelector<HTMLElement>('#stats')!;
const detailsEl = document.querySelector<HTMLElement>('#details')!;
const form = document.querySelector<HTMLFormElement>('#filters')!;

const map = createMap(document.querySelector<HTMLElement>('#map')!, showDetails);
let all: Meteorite[] = [];

function readFilters(): Filters {
  const data = new FormData(form);
  const num = (key: string) => {
    const v = String(data.get(key) ?? '').trim();
    return v === '' || Number.isNaN(Number(v)) ? null : Number(v);
  };
  return {
    query: String(data.get('query') ?? ''),
    fall: (data.get('fall') as Filters['fall']) ?? 'all',
    yearFrom: num('yearFrom'),
    yearTo: num('yearTo'),
    minMassKg: num('minMassKg'),
  };
}

function update() {
  const visible = filterMeteorites(all, readFilters());
  map.render(visible);
  statsEl.textContent = `Showing ${visible.length.toLocaleString()} of ${all.length.toLocaleString()} meteorites`;
}

function showDetails(m: Meteorite) {
  detailsEl.hidden = false;
  detailsEl.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = m.name;
  const dl = document.createElement('dl');
  const rows: [string, string][] = [
    ['Class', m.recclass || 'Unknown'],
    ['Mass', formatMass(m.mass)],
    ['Observed', m.fall === 'Fell' ? 'Seen falling' : 'Found later'],
    ['Year', m.year?.toString() ?? 'Unknown'],
    ['Location', `${m.lat.toFixed(3)}, ${m.lon.toFixed(3)}`],
  ];
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  detailsEl.append(h, dl);
}

form.addEventListener('input', update);
// "reset" fires before the fields are cleared, so defer the refresh.
form.addEventListener('reset', () => setTimeout(update));

loadMeteorites(`${import.meta.env.BASE_URL}data/meteorites.json`)
  .then((items) => {
    all = items;
    update();
  })
  .catch((err: unknown) => {
    console.error(err);
    statsEl.textContent = 'Could not load meteorite data.';
  });
