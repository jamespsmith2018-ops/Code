# ☄️ Meteorite Tracker

An interactive map for exploring recorded meteorite landings, built as a static
site so it can be published anywhere (GitHub Pages, Netlify, Cloudflare Pages, S3…).

**Stack:** [Vite](https://vite.dev) · TypeScript · [Leaflet](https://leafletjs.com) ·
[Vitest](https://vitest.dev) · Prettier. No backend required.

## Getting started

Requires Node.js 20+ (22 recommended, see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173 with hot reload
```

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the dev server                               |
| `npm run build`      | Type-check and build the static site into `dist/`  |
| `npm run preview`    | Serve the built `dist/` locally                    |
| `npm test`           | Run unit tests                                     |
| `npm run format`     | Format all files with Prettier                     |
| `npm run fetch-data` | Download the full NASA dataset into `public/data/` |

## Data

The site loads `public/data/meteorites.json`, an array of records shaped like
`Meteorite` in [`src/types.ts`](src/types.ts).

- **Committed by default:** a small sample of 21 well-known meteorites
  (`scripts/sample-data.json`) so the site works offline and out of the box.
  Values are approximate.
- **Full dataset:** `npm run fetch-data` downloads NASA's
  [Meteorite Landings](https://data.nasa.gov/) dataset (~45,000 records from
  The Meteoritical Society), drops rows without coordinates, and writes the
  normalised result. Point it at a different JSON or CSV source with
  `METEORITE_DATA_URL=<url> npm run fetch-data`.

The deploy workflow runs `fetch-data` on every build, so the published site
gets the full dataset even though the repo only stores the sample. To restore
the sample locally: `cp scripts/sample-data.json public/data/meteorites.json`.

## Project layout

```
index.html              page shell (header, filter form, map container)
src/main.ts             wires filters → data → map, renders the details panel
src/map.ts              Leaflet map and marker rendering
src/data.ts             loading, filtering and formatting helpers
src/types.ts            shared types
src/style.css           styles (dark theme, responsive layout)
scripts/fetch-data.mjs  dataset downloader
scripts/normalize.mjs   raw NASA row → Meteorite conversion (JSON + CSV)
public/data/            data served as-is with the site
.github/workflows/      CI checks and GitHub Pages deployment
```

## Publishing

### GitHub Pages (pre-configured)

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the _Deploy to GitHub Pages_ workflow manually).

The site is published at `https://<user>.github.io/<repo>/`. The workflow sets
`BASE_PATH` automatically so asset URLs work under that sub-path.

### Anywhere else

Run `npm run build` and upload the `dist/` folder to any static host. If the
site is served from a sub-path rather than a domain root, build with
`BASE_PATH=/your-path/ npm run build`.

## Ideas for next steps

- Marker clustering or heatmap view for the full dataset
- Charts: falls per decade, mass distribution, most common classes
- Shareable URLs that encode the current filters
- A searchable/sortable table view alongside the map
- Live fireball data from NASA CNEOS
