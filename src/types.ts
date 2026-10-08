/** A single meteorite record, normalised from the NASA Meteorite Landings dataset. */
export interface Meteorite {
  id: string;
  name: string;
  /** Classification, e.g. "L6", "H5", "Iron, IIAB". */
  recclass: string;
  /** Mass in grams, when known. */
  mass: number | null;
  /** "Fell" = observed falling, "Found" = discovered later. */
  fall: 'Fell' | 'Found';
  year: number | null;
  lat: number;
  lon: number;
}

export interface Filters {
  query: string;
  fall: 'all' | 'Fell' | 'Found';
  yearFrom: number | null;
  yearTo: number | null;
  minMassKg: number | null;
}

/** A meteor recorded by 2+ UK Meteor Network cameras (see scripts/ukmon.mjs). */
export interface UkMeteor {
  /** UKMON event id, e.g. "20260424_000052.674_UK". */
  id: string;
  /** ISO time (UTC). */
  t: string;
  /** IAU shower code, or "spo" for sporadic. */
  shower: string;
  /** Absolute magnitude: lower is brighter. */
  mag: number | null;
  lat1: number;
  lon1: number;
  /** Start height (km). */
  h1: number | null;
  lat2: number;
  lon2: number;
  /** End height (km). */
  h2: number | null;
  /** Geocentric velocity (km/s). */
  vg: number | null;
  /** Duration (s). */
  dur: number | null;
  stations: string[];
}

export interface UkmonIndex {
  months: { month: string; count: number }[];
  /** Shower code -> name. */
  showers: Record<string, string>;
  updated?: string;
}

export interface UkmonFilters {
  shower: string;
  /** Only meteors at least this bright (magnitude <= maxMag). */
  maxMag: number | null;
  hideSporadic: boolean;
  /** Day of month, or null for the whole month. */
  day: number | null;
}
