# Meteorite Tracker

Static site (Vite + TypeScript + Leaflet) mapping meteorite landings. No backend;
data is a JSON file in `public/data/meteorites.json`.

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc --noEmit`) + production build to `dist/`
- `npm test` — Vitest unit tests (`src/**/*.test.ts`, `scripts/**/*.test.mjs`)
- `npm run format` / `npm run format:check` — Prettier
- `npm run fetch-data` — replace sample data with the full NASA dataset

Before committing: `npm run format:check && npm test && npm run build`.

## Conventions

- Data shape lives in `src/types.ts`; keep `scripts/normalize.mjs` producing that shape.
- Keep data-processing logic in pure functions (`src/data.ts`) with tests; keep DOM code in `main.ts`/`map.ts`.
- Asset and data URLs must respect `import.meta.env.BASE_URL` so the site works under a sub-path (GitHub Pages).
- Don't commit the full fetched dataset; the repo keeps the sample (`scripts/sample-data.json`) and CI fetches the full data at deploy time.
