export interface GymEntry {
  id: string;
  name: string;
  lat: number;
  lng: number;
  defended: boolean;
  /** ISO-8601 UTC timestamp — set when defended becomes true; used for elapsed-time calculations. */
  defendedSince?: string;
  defenderPokemon?: string;
}
