export interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export interface Poi {
  id: number;
  lat: number;
  lng: number;
  name: string;
  category: string;
}

export type PoiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; pois: Poi[] }
  | { status: 'error'; message: string };
