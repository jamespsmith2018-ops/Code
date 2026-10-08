# Meteorite Tracker

Static site (Vite + TypeScript + Leaflet) with two map views: meteorite landings
(`public/data/meteorites.json`) and UK Meteor Network tracks (`public/data/ukmon/`,
one file per month plus `index.json`). No backend.

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc --noEmit`) + production build to `dist/`
- `npm test` — Vitest unit tests (`src/**/*.test.ts`, `scripts/**/*.test.mjs`)
- `npm run format` / `npm run format:check` — Prettier
- `npm run fetch-data` — replace sample data with the full NASA dataset
- `npm run ukmon -- --from <dir> | --days N | --start/--end | --resume` — build UK meteor month files

Before committing: `npm run format:check && npm test && npm run build`.

## Conventions

- Data shapes live in `src/types.ts`; keep `scripts/normalize.mjs` and `scripts/ukmon.mjs` producing them.
- Keep data-processing logic in pure functions (`src/data.ts`) with tests; keep DOM code in `main.ts`/`map.ts`.
- Asset and data URLs must respect `import.meta.env.BASE_URL` so the site works under a sub-path (GitHub Pages).
- Don't commit the full fetched dataset; the repo keeps the sample (`scripts/sample-data.json`) and CI fetches the full data at deploy time.
- UK meteor month files are committed (unlike the full NASA dataset) so the site has history; the deploy workflow tops them up with `--resume`. The raw daily data lives in the separate `uk-meteor-data` repo.
