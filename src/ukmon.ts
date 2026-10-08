import type { UkMeteor, UkmonFilters } from './types';

export const SPORADIC = 'spo';
export const SPORADIC_COLOR = '#94a3b8';
export const OTHER_COLOR = '#e879f9';

// Distinct colours for the most common showers in the current view.
const PALETTE = [
  '#f97316',
  '#38bdf8',
  '#a3e635',
  '#facc15',
  '#f43f5e',
  '#2dd4bf',
  '#a78bfa',
  '#fb7185',
];

export function filterUkMeteors(items: readonly UkMeteor[], f: UkmonFilters): UkMeteor[] {
  return items.filter((m) => {
    if (f.shower !== 'all' && m.shower !== f.shower) return false;
    if (f.hideSporadic && m.shower === SPORADIC) return false;
    if (f.maxMag != null && (m.mag == null || m.mag > f.maxMag)) return false;
    if (f.day != null && Number(m.t.slice(8, 10)) !== f.day) return false;
    return true;
  });
}

/** Showers sorted by how often they appear, most common first. */
export function showerCounts(items: readonly UkMeteor[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const m of items) counts.set(m.shower, (counts.get(m.shower) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Assigns colours: sporadic is grey, the top named showers get palette colours. */
export function showerColors(items: readonly UkMeteor[]): Map<string, string> {
  const colors = new Map<string, string>([[SPORADIC, SPORADIC_COLOR]]);
  const named = showerCounts(items).filter(([code]) => code !== SPORADIC);
  named.slice(0, PALETTE.length).forEach(([code], i) => colors.set(code, PALETTE[i]));
  return colors;
}

/** Line weight in pixels: brighter meteors (lower magnitude) are drawn thicker. */
export function trackWeight(mag: number | null): number {
  if (mag == null) return 1.5;
  return Math.max(1, Math.min(6, 3 - mag * 0.6));
}

/** Link to the UKMON archive page for an event. */
export function reportUrl(id: string): string {
  const [y, mo, d] = [id.slice(0, 4), id.slice(4, 6), id.slice(6, 8)];
  return `https://archive.ukmeteors.co.uk/reports/${y}/orbits/${y}${mo}/${y}${mo}${d}/${id}/index.html`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const FALL_COLOR = '#f8fafc';
export const IMPACT_COLOR = '#ef4444';

/** Months ("YYYY-MM") that have modelled fall points, newest first. */
export function fallPointMonths(points: Record<string, unknown>): string[] {
  const months = new Set(Object.keys(points).map((id) => `${id.slice(0, 4)}-${id.slice(4, 6)}`));
  return [...months].sort().reverse();
}

export function formatMass(kg: number | null): string {
  if (kg == null) return 'Unknown';
  if (kg >= 1000) return `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`;
  if (kg >= 1) return `${kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`;
  return `${(kg * 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
}
