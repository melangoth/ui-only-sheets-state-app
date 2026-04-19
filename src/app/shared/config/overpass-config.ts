export const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/** Radius in metres for the Overpass `around` query. */
export const SEARCH_RADIUS_METERS = 500;

/** Minimum displacement in metres before a new fetch is triggered. */
export const MIN_MOVE_METERS = 200;

/**
 * OSM tag filters used to identify candidate PokéStop/Gym POIs.
 * Each entry is a `key=value` pair that maps to a `node[key=value]` filter.
 */
export const OSM_POI_TAGS: ReadonlyArray<string> = [
  'amenity=place_of_worship',
  'amenity=library',
  'amenity=community_centre',
  'historic=memorial',
  'historic=monument',
  'historic=statue',
  'tourism=artwork',
  'tourism=attraction',
  'tourism=museum',
  'leisure=park',
  'leisure=sports_centre',
  'man_made=lighthouse',
];
