// Downloads the full NASA Meteorite Landings dataset (~45k records) and writes
// the normalised result to public/data/meteorites.json.
//
//   npm run fetch-data
//   METEORITE_DATA_URL=https://example.org/Meteorite_Landings.csv npm run fetch-data
//
// The source may be the JSON API or a CSV export; the format is detected
// from the response.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizeAll, parseCsv } from './normalize.mjs';

// NASA retired the old Socrata API (it now 404s); the CSV moved under /docs/legacy/.
const DEFAULT_URLS = [
  'https://data.nasa.gov/docs/legacy/meteorite_landings/Meteorite_Landings.csv',
  'https://data.nasa.gov/resource/gh4g-8sxz.json?$limit=100000',
];
const urls = process.env.METEORITE_DATA_URL ? [process.env.METEORITE_DATA_URL] : DEFAULT_URLS;
const outFile = fileURLToPath(new URL('../public/data/meteorites.json', import.meta.url));

let text = null;
for (const url of urls) {
  console.log(`Fetching ${url}`);
  try {
    const res = await fetch(url);
    if (res.ok) {
      text = await res.text();
      break;
    }
    console.error(`  failed: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`  failed: ${err.message}`);
  }
}
if (text == null) {
  console.error('All sources failed; leaving existing data untouched.');
  process.exit(1);
}

const rows = text.trimStart().startsWith('[') ? JSON.parse(text) : parseCsv(text);
const records = normalizeAll(rows);

if (records.length === 0) {
  console.error('No usable records found; leaving existing data untouched.');
  process.exit(1);
}

await writeFile(outFile, JSON.stringify(records));
console.log(
  `Wrote ${records.length.toLocaleString()} of ${rows.length.toLocaleString()} records to ${outFile}`,
);
