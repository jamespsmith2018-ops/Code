import './style.css';
import { filterMeteorites, formatMass, loadMeteorites } from './data';
import { createMap } from './map';
import type { Filters, Meteorite, UkMeteor, UkmonFilters, UkmonIndex } from './types';
import {
  filterUkMeteors,
  formatMonth,
  OTHER_COLOR,
  reportUrl,
  showerColors,
  showerCounts,
  SPORADIC,
} from './ukmon';

type Mode = 'landings' | 'uk';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const statsEl = $('#stats');
const detailsEl = $('#details');
const landingsForm = $<HTMLFormElement>('#filters');
const ukForm = $<HTMLFormElement>('#uk-filters');
const legendEl = $('#legend');
const map = createMap($('#map'));
const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;

let mode: Mode = 'landings';

// ---------- details panel ----------

function showDetails(title: string, rows: [string, string][], link?: [string, string]) {
  detailsEl.hidden = false;
  detailsEl.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = title;
  const dl = document.createElement('dl');
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
  detailsEl.append(h, dl);
  if (link) {
    const a = document.createElement('a');
    a.href = link[1];
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link[0];
    detailsEl.append(a);
  }
}

// ---------- meteorite landings ----------

let landings: Meteorite[] | null = null;

function readLandingFilters(): Filters {
  const data = new FormData(landingsForm);
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

function showLanding(m: Meteorite) {
  showDetails(m.name, [
    ['Class', m.recclass || 'Unknown'],
    ['Mass', formatMass(m.mass)],
    ['Observed', m.fall === 'Fell' ? 'Seen falling' : 'Found later'],
    ['Year', m.year?.toString() ?? 'Unknown'],
    ['Location', `${m.lat.toFixed(3)}, ${m.lon.toFixed(3)}`],
  ]);
}

function updateLandings() {
  if (mode !== 'landings') return;
  if (!landings) {
    statsEl.textContent = 'Loading meteorite landings…';
    return;
  }
  const visible = filterMeteorites(landings, readLandingFilters());
  map.renderLandings(visible, showLanding);
  statsEl.textContent = `Showing ${visible.length.toLocaleString()} of ${landings.length.toLocaleString()} meteorite landings`;
}

// ---------- UK Meteor Network ----------

let ukIndex: UkmonIndex | null = null;
const ukMonths = new Map<string, Promise<UkMeteor[]>>();
let ukMonth: UkMeteor[] = [];

const showerName = (code: string) =>
  code === SPORADIC ? 'Sporadic' : (ukIndex?.showers[code] ?? code);

function readUkFilters(): UkmonFilters {
  const data = new FormData(ukForm);
  const maxMag = String(data.get('maxMag') ?? '');
  const day = String(data.get('day') ?? '');
  return {
    shower: String(data.get('shower') ?? 'all'),
    maxMag: maxMag === '' ? null : Number(maxMag),
    hideSporadic: data.get('hideSporadic') === 'on',
    day: day === '' ? null : Number(day),
  };
}

function loadUkMonth(month: string): Promise<UkMeteor[]> {
  if (!ukMonths.has(month)) {
    const p = fetch(dataUrl(`ukmon/${month}.json`)).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${month}: ${r.status}`);
      return r.json() as Promise<UkMeteor[]>;
    });
    p.catch(() => ukMonths.delete(month)); // allow a retry
    ukMonths.set(month, p);
  }
  return ukMonths.get(month)!;
}

function setOptions(
  select: HTMLSelectElement,
  first: [string, string],
  options: [string, string][],
) {
  const keep = select.value;
  select.replaceChildren(...[first, ...options].map(([value, label]) => new Option(label, value)));
  select.value = options.some(([v]) => v === keep) ? keep : first[0];
}

/** Rebuilds the day and shower lists for the loaded month. */
function refreshUkOptions(month: string) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const perDay = new Map<number, number>();
  for (const ev of ukMonth) {
    const d = Number(ev.t.slice(8, 10));
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  setOptions(
    ukForm.elements.namedItem('day') as HTMLSelectElement,
    ['', 'Whole month'],
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
      .filter((d) => perDay.has(d))
      .map((d) => [String(d), `${d} ${formatMonth(month).split(' ')[0]} (${perDay.get(d)})`]),
  );
  setOptions(
    ukForm.elements.namedItem('shower') as HTMLSelectElement,
    ['all', 'All showers'],
    showerCounts(ukMonth).map(([code, n]) => [code, `${showerName(code)} (${n})`]),
  );
}

function renderLegend(colors: Map<string, string>, visible: readonly UkMeteor[]) {
  const counts = showerCounts(visible);
  const items = counts.filter(([code]) => colors.has(code));
  const others = counts.filter(([code]) => !colors.has(code)).reduce((n, [, c]) => n + c, 0);
  const rows: [string, string, number][] = items.map(([code, n]) => [
    colors.get(code)!,
    showerName(code),
    n,
  ]);
  if (others) rows.push([OTHER_COLOR, 'Other showers', others]);
  legendEl.replaceChildren(
    ...rows.map(([color, label, n]) => {
      const li = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = color;
      li.append(swatch, `${label} — ${n.toLocaleString()}`);
      return li;
    }),
  );
}

function showUkMeteor(m: UkMeteor) {
  const fmt = (v: number | null, unit: string) => (v == null ? 'Unknown' : `${v} ${unit}`);
  showDetails(
    showerName(m.shower),
    [
      ['Time (UTC)', m.t.replace('T', ' ').replace(/\.\d+Z$|Z$/, '')],
      ['Magnitude', m.mag?.toString() ?? 'Unknown'],
      ['Start height', fmt(m.h1, 'km')],
      ['End height', fmt(m.h2, 'km')],
      ['Speed', fmt(m.vg, 'km/s')],
      ['Duration', fmt(m.dur, 's')],
      ['Cameras', `${m.stations.length}: ${m.stations.join(', ')}`],
    ],
    ['View UKMON report ↗', reportUrl(m.id)],
  );
}

let ukRenderToken = 0;
async function updateUk(monthChanged = false) {
  if (mode !== 'uk') return;
  const token = ++ukRenderToken;
  const monthSelect = ukForm.elements.namedItem('month') as HTMLSelectElement;

  try {
    if (!ukIndex) {
      statsEl.textContent = 'Loading UK meteor data…';
      ukIndex = (await (await fetch(dataUrl('ukmon/index.json'))).json()) as UkmonIndex;
      const months = [...ukIndex.months].reverse();
      monthSelect.replaceChildren(
        ...months.map(
          (m) => new Option(`${formatMonth(m.month)} (${m.count.toLocaleString()})`, m.month),
        ),
      );
      monthChanged = true;
    }
    const month = monthSelect.value;
    if (!month) {
      statsEl.textContent = 'No UK meteor data available yet.';
      return;
    }
    if (monthChanged || ukMonth.length === 0) {
      statsEl.textContent = `Loading ${formatMonth(month)}…`;
      const data = await loadUkMonth(month);
      if (token !== ukRenderToken) return;
      ukMonth = data;
      refreshUkOptions(month);
    }
    if (token !== ukRenderToken) return;

    const visible = filterUkMeteors(ukMonth, readUkFilters());
    const colors = showerColors(visible);
    map.renderTracks(visible, colors, showUkMeteor);
    renderLegend(colors, visible);
    statsEl.textContent = `Showing ${visible.length.toLocaleString()} of ${ukMonth.length.toLocaleString()} UK meteors in ${formatMonth(month)}`;
  } catch (err) {
    console.error(err);
    if (token === ukRenderToken) statsEl.textContent = 'Could not load UK meteor data.';
  }
}

// ---------- mode switching ----------

function setMode(next: Mode) {
  mode = next;
  for (const tab of document.querySelectorAll<HTMLElement>('[data-mode]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
  }
  for (const panel of document.querySelectorAll<HTMLElement>('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== mode;
  }
  detailsEl.hidden = true;
  if (mode === 'uk') {
    map.focusUk();
    void updateUk();
  } else {
    map.focusWorld();
    updateLandings();
  }
}

const modeFromHash = (): Mode => (location.hash === '#uk-meteors' ? 'uk' : 'landings');
window.addEventListener('hashchange', () => setMode(modeFromHash()));

landingsForm.addEventListener('input', updateLandings);
// "reset" fires before the fields are cleared, so defer the refresh.
landingsForm.addEventListener('reset', () => setTimeout(updateLandings));
ukForm.addEventListener('input', (e) => {
  const monthChanged = (e.target as HTMLElement).getAttribute('name') === 'month';
  if (monthChanged) (ukForm.elements.namedItem('day') as HTMLSelectElement).value = '';
  void updateUk(monthChanged);
});

loadMeteorites(dataUrl('meteorites.json'))
  .then((items) => {
    landings = items;
    updateLandings();
  })
  .catch((err: unknown) => {
    console.error(err);
    if (mode === 'landings') statsEl.textContent = 'Could not load meteorite data.';
  });

setMode(modeFromHash());
