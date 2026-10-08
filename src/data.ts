import type { Filters, Meteorite } from './types';

export async function loadMeteorites(url: string): Promise<Meteorite[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as Meteorite[];
}

export function filterMeteorites(items: readonly Meteorite[], f: Filters): Meteorite[] {
  const query = f.query.trim().toLowerCase();
  const minMass = f.minMassKg != null ? f.minMassKg * 1000 : null;

  return items.filter((m) => {
    if (query && !m.name.toLowerCase().includes(query)) return false;
    if (f.fall !== 'all' && m.fall !== f.fall) return false;
    if (f.yearFrom != null && (m.year == null || m.year < f.yearFrom)) return false;
    if (f.yearTo != null && (m.year == null || m.year > f.yearTo)) return false;
    if (minMass != null && (m.mass == null || m.mass < minMass)) return false;
    return true;
  });
}

export function formatMass(grams: number | null): string {
  if (grams == null) return 'Unknown';
  if (grams >= 1_000_000)
    return `${(grams / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`;
  if (grams >= 1000)
    return `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
  return `${grams.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`;
}

/** Marker radius in pixels, scaled logarithmically by mass. */
export function markerRadius(grams: number | null): number {
  if (grams == null || grams <= 0) return 3;
  return Math.min(16, 2 + Math.log10(grams) * 1.6);
}
