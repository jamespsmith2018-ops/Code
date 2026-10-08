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
