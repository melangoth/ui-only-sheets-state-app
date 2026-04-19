import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PoiState, Poi, OverpassResponse } from './overpass.model';
import {
  OVERPASS_API_URL,
  SEARCH_RADIUS_METERS,
  MIN_MOVE_METERS,
  OSM_POI_TAGS,
} from '../../shared/config/overpass-config';

@Injectable({ providedIn: 'root' })
export class OverpassService {
  private http = inject(HttpClient);

  private _poiState = signal<PoiState>({ status: 'idle' });
  readonly poiState = this._poiState.asReadonly();

  private _lastFetchCoords: { lat: number; lng: number } | null = null;

  fetchPois(lat: number, lng: number): void {
    const current = this._poiState();
    if (
      current.status === 'loaded' &&
      this._lastFetchCoords !== null &&
      this.haversineDistance(this._lastFetchCoords, { lat, lng }) < MIN_MOVE_METERS
    ) {
      return;
    }

    this._poiState.set({ status: 'loading' });

    const tagFilters = OSM_POI_TAGS.map(
      tag => `node[${tag}](around:${SEARCH_RADIUS_METERS},${lat},${lng});`,
    ).join('\n');

    const query = `[out:json][timeout:25];\n(\n${tagFilters}\n);\nout body;`;

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const body = 'data=' + encodeURIComponent(query);

    this.http.post<OverpassResponse>(OVERPASS_API_URL, body, { headers }).subscribe({
      next: response => {
        const pois: Poi[] = response.elements.map(el => ({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          name: el.tags?.['name'] ?? 'Unnamed POI',
          category: this.deriveCategory(el.tags),
        }));
        this._poiState.set({ status: 'loaded', pois });
        this._lastFetchCoords = { lat, lng };
      },
      error: err => {
        const message: string =
          err?.message ?? 'Failed to fetch nearby points of interest.';
        this._poiState.set({ status: 'error', message });
      },
    });
  }

  private deriveCategory(tags: Record<string, string>): string {
    for (const tag of OSM_POI_TAGS) {
      const [key, value] = tag.split('=');
      if (tags[key] === value) {
        return tag;
      }
    }
    return 'poi';
  }

  private haversineDistance(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number {
    const R = 6_371_000; // Earth radius in metres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const haversine =
      sinDLat * sinDLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.sqrt(haversine));
  }
}
