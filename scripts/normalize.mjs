// Converts raw NASA Meteorite Landings records (JSON API rows or CSV rows)
// into the compact shape the site loads (see src/types.ts).

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Pulls a 4-digit year out of "1880", "1880-01-01T00:00:00.000" or "01/01/1880 12:00:00 AM". */
const parseYear = (v) => {
  const match = String(v ?? '').match(/\d{4}/);
  return match ? Number(match[0]) : null;
};

export function normalizeRecord(raw) {
  const lat = num(raw.reclat);
  const lon = num(raw.reclong);
  // Records without coordinates, or at the 0,0 placeholder, can't be mapped.
  if (lat == null || lon == null || (lat === 0 && lon === 0)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  return {
    id: String(raw.id),
    name: String(raw.name ?? '').trim(),
    recclass: String(raw.recclass ?? '').trim(),
    mass: num(raw.mass ?? raw['mass (g)']),
    fall: raw.fall === 'Fell' ? 'Fell' : 'Found',
    year: parseYear(raw.year),
    lat,
    lon,
  };
}

export function normalizeAll(rows) {
  return rows.map(normalizeRecord).filter(Boolean);
}

/** Minimal RFC 4180 CSV parser: returns an array of objects keyed by header. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((f) => f !== ''));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}
