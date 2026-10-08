// Converts a raw UKMON summary event into the compact shape the site loads
// (see UkMeteor in src/types.ts).

const round = (v, dp) => (Number.isFinite(Number(v)) ? Number(Number(v).toFixed(dp)) : null);

/** "20260424_000052.674_UK" -> "2026-04-24T00:00:52.674Z" */
export function orbnameToIso(orbname) {
  const m = String(orbname).match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(\.\d+)?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac = ''] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${frac}Z`;
}

export function compactEvent(raw) {
  const t = orbnameToIso(raw.orbname);
  const lat1 = round(raw._lat1, 4);
  const lon1 = round(raw._lng1, 4);
  const lat2 = round(raw._lat2, 4);
  const lon2 = round(raw._lng2, 4);
  if (!t || lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

  return {
    id: String(raw.orbname),
    t,
    shower: String(raw._stream ?? 'spo').trim() || 'spo',
    mag: round(raw._mag, 2),
    lat1,
    lon1,
    h1: round(raw._H1, 1),
    lat2,
    lon2,
    h2: round(raw._H2, 1),
    vg: round(raw._vg, 1),
    dur: round(raw._dur, 2),
    stations: String(raw.stations ?? '')
      .split(/[;,\s]+/)
      .filter(Boolean),
  };
}
