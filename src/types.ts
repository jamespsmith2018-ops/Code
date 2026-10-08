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

/**
 * Modelled landing site for a UKMON meteor (analysis/fall_points.py, stony scenario):
 * where a >= 1 g meteorite would land if a body big enough to drop one had
 * followed the same trajectory. Hypothetical: the observed meteoroids burnt up.
 */
export interface FallPoint {
  type: 'meteorite fall' | 'hypervelocity impact' | string;
  lat: number | null;
  lon: number | null;
  /** Smallest initial mass (kg) that would put >= 1 g on the ground. */
  minMassKg: number | null;
  diameterM: number | null;
  /** Ground impact speed (m/s). */
  impactSpeed: number | null;
  /** Height (km) at which dark flight starts. */
  darkFlightKm: number | null;
  /** Height (km) where the observed meteoroid is modelled to burn out (cometary). */
  burnoutKm: number | null;
}
