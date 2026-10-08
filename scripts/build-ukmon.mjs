// Builds the compact UK Meteor Network (UKMON) files the site loads:
//   public/data/ukmon/YYYY-MM.json   meteors for that month
//   public/data/ukmon/index.json     available months + shower names
//
// Sources (pick one):
//   --from <dir>     a folder of daily summary files (YYYYMMDD.json), e.g. a
//                    checkout of the uk-meteor-data repo: ../uk-meteor-data/data/summary
//   --days <n>       fetch the last n days straight from api.ukmeteors.co.uk
//   --start YYYY-MM-DD --end YYYY-MM-DD   fetch a date range from the API
//   --resume         fetch from 3 days before the newest day already built up
//                    to today (used by the deploy workflow to stay current)
//
// Days that are re-fetched replace what was there; other days are kept.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { compactEvent } from './ukmon.mjs';

const API = 'https://api.ukmeteors.co.uk/matches?reqtyp=summary&reqval=';
const outDir = fileURLToPath(new URL('../public/data/ukmon/', import.meta.url));

const { values: args } = parseArgs({
  options: {
    from: { type: 'string' },
    days: { type: 'string' },
    start: { type: 'string' },
    end: { type: 'string' },
    resume: { type: 'boolean' },
  },
});

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '');

/** Map of YYYYMMDD -> raw summary events. */
async function loadFromDir(dir) {
  const days = new Map();
  for (const entry of await readdir(dir, { recursive: true })) {
    const m = entry.match(/(\d{8})\.json$/);
    if (!m) continue;
    const data = JSON.parse(await readFile(join(dir, entry), 'utf8'));
    days.set(m[1], Array.isArray(data) ? data : []);
  }
  return days;
}

async function loadFromApi(start, end) {
  const days = new Map();
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = ymd(d);
    try {
      const res = await fetch(API + key);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      days.set(key, Array.isArray(data) ? data : []);
      console.log(`${key}: ${days.get(key).length} meteors`);
    } catch (err) {
      console.error(`${key}: FAILED ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 500)); // be polite to a volunteer-run service
  }
  return days;
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Newest event date already in the built files, or null. */
async function newestBuiltDay() {
  const index = await readJson(join(outDir, 'index.json'), { months: [] });
  const last = index.months.at(-1);
  if (!last) return null;
  const events = await readJson(join(outDir, `${last.month}.json`), []);
  return events.length ? new Date(events.at(-1).t.slice(0, 10)) : null;
}

let days;
if (args.resume) {
  const newest = await newestBuiltDay();
  // Recent days can gain matches as more camera data arrives, so overlap a little.
  const start = newest
    ? new Date(newest.getTime() - 3 * 86_400_000)
    : new Date(Date.now() - 6 * 86_400_000);
  days = await loadFromApi(start, new Date());
} else if (args.from) {
  days = await loadFromDir(args.from);
} else {
  const end = args.end ? new Date(args.end) : new Date();
  const start = args.start
    ? new Date(args.start)
    : new Date(end.getTime() - (Number(args.days ?? 7) - 1) * 86_400_000);
  days = await loadFromApi(start, end);
}
if (days.size === 0) {
  console.error('No days loaded; nothing to do.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const indexPath = join(outDir, 'index.json');
const index = await readJson(indexPath, { months: [], showers: {} });

// Group the loaded days by month and merge into each month file.
const byMonth = new Map();
for (const [day, events] of days) {
  const month = `${day.slice(0, 4)}-${day.slice(4, 6)}`;
  if (!byMonth.has(month)) byMonth.set(month, new Map());
  byMonth.get(month).set(day, events);
}

const counts = new Map(index.months.map((m) => [m.month, m.count]));
for (const [month, monthDays] of byMonth) {
  const path = join(outDir, `${month}.json`);
  const kept = (await readJson(path, [])).filter((e) => !monthDays.has(e.id.slice(0, 8)));
  const fresh = [];
  for (const events of monthDays.values()) {
    for (const raw of events) {
      const ev = compactEvent(raw);
      if (!ev) continue;
      fresh.push(ev);
      if (ev.shower !== 'spo') index.showers[ev.shower] = String(raw.name ?? '').trim();
    }
  }
  const all = [...kept, ...fresh].sort((a, b) => a.t.localeCompare(b.t));
  await writeFile(path, JSON.stringify(all));
  counts.set(month, all.length);
  console.log(`${month}: ${all.length} meteors`);
}

index.months = [...counts]
  .map(([month, count]) => ({ month, count }))
  .sort((a, b) => a.month.localeCompare(b.month));
index.showers = Object.fromEntries(Object.entries(index.showers).sort());
index.updated = new Date().toISOString();
await writeFile(indexPath, JSON.stringify(index, null, 1) + '\n');
