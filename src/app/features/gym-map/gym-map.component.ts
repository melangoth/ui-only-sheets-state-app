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
  readonly locationState = this.geo.locationState;

  private map: L.Map | null = null;
  private marker: L.CircleMarker | null = null;

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
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.marker = null;
    this.geo.reset();
  }

  retry(): void {
    this.geo.requestLocation();
  }
}
