import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { GeolocationService } from '../../core/geolocation/geolocation.service';
import { OverpassService } from '../../core/overpass/overpass.service';
import { Poi } from '../../core/overpass/overpass.model';
import { MAP_CONFIG } from '../../shared/config/map-config';

@Component({
  selector: 'app-gym-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gym-map.component.html',
  styleUrls: ['./gym-map.component.css'],
})
export class GymMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapEl!: ElementRef<HTMLDivElement>;

  private geo = inject(GeolocationService);
  private overpass = inject(OverpassService);

  readonly locationState = this.geo.locationState;
  readonly poiState = this.overpass.poiState;

  private map: L.Map | null = null;
  private marker: L.CircleMarker | null = null;
  private poiMarkers = new Map<number, L.Marker>();

  constructor() {
    effect(() => {
      const state = this.locationState();
      if (state.status === 'located' && this.map) {
        const latlng: L.LatLngExpression = [state.lat, state.lng];
        this.map.setView(latlng, MAP_CONFIG.defaultZoom);
        if (this.marker) {
          this.marker.setLatLng(latlng);
        } else {
          this.marker = L.circleMarker(latlng, {
            radius: 10,
            color: '#0d6efd',
            fillColor: '#0d6efd',
            fillOpacity: 0.6,
          })
            .addTo(this.map)
            .bindPopup('📍 You are here')
            .openPopup();
        }
        this.overpass.fetchPois(state.lat, state.lng);
      }
    });

    effect(() => {
      const state = this.poiState();
      if (state.status === 'loaded' && this.map) {
        this.syncPoiMarkers(state.pois);
      }
    });
  }

  ngOnInit(): void {
    this.geo.reset();
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
    });

    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.tileAttribution,
      maxZoom: MAP_CONFIG.maxZoom,
    }).addTo(this.map);

    this.geo.requestLocation();
  }

  ngOnDestroy(): void {
    this.clearPoiMarkers();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.marker = null;
    this.geo.reset();
  }

  get loadedPois(): number {
    const state = this.poiState();
    return state.status === 'loaded' ? state.pois.length : 0;
  }

  retry(): void {
    this.geo.requestLocation();
  }

  private syncPoiMarkers(pois: Poi[]): void {
    if (!this.map) return;

    const incomingIds = new Set(pois.map(p => p.id));

    // Remove markers no longer in the result set
    for (const [id, marker] of this.poiMarkers) {
      if (!incomingIds.has(id)) {
        marker.remove();
        this.poiMarkers.delete(id);
      }
    }

    // Add markers for new POIs
    for (const poi of pois) {
      if (this.poiMarkers.has(poi.id)) continue;

      const icon = L.divIcon({
        className: '',
        html: '<div class="poi-marker"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([poi.lat, poi.lng], { icon })
        .addTo(this.map!)
        .bindPopup(`<strong>${poi.name}</strong><br/><small>${poi.category}</small>`);

      this.poiMarkers.set(poi.id, marker);
    }
  }

  private clearPoiMarkers(): void {
    for (const marker of this.poiMarkers.values()) {
      marker.remove();
    }
    this.poiMarkers.clear();
  }
}
