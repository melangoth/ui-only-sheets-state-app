import {
  Component,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { GeolocationService } from '../../core/geolocation/geolocation.service';
import { StorageFileService } from '../../core/storage/storage-file.service';
import { GymRepository } from '../../core/storage/gym.repository';
import { GymEntry } from '../../shared/models/gym.model';
import { MAP_CONFIG } from '../../shared/config/map-config';

const DEFENDED_GYM_COLOR = '#16a34a';
const UNDEFENDED_GYM_COLOR = '#2563eb';
const CURRENT_LOCATION_PANE = 'currentLocationPane';

@Component({
  selector: 'app-gym-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gym-map.component.html',
  styleUrls: ['./gym-map.component.css'],
})
export class GymMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapEl!: ElementRef<HTMLDivElement>;

  private geo = inject(GeolocationService);
  private storageFile = inject(StorageFileService);
  private gymRepo = inject(GymRepository);

  readonly locationState = this.geo.locationState;
  readonly spreadsheetReady = this.storageFile.spreadsheetReady;

  private map: L.Map | null = null;
  private currentLocationMarker: L.CircleMarker | null = null;
  private gymMarkers: L.CircleMarker[] = [];
  private mapReady = signal(false);
  private hasInitialCentered = false;

  mapCenter = signal<{ lat: number; lng: number } | null>(null);
  showSavePanel = signal(false);
  gymName = signal('');
  defended = signal(false);
  defenderPokemon = signal('');
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  constructor() {
    // Re-centre the map when location updates.
    effect(() => {
      this.centerMapOnCurrentLocation();
    });

    // Load and render saved gym markers once both the spreadsheet and the map
    // are ready. Tracking both as signals ensures the effect fires exactly once
    // regardless of which becomes ready first.
    effect(() => {
      if (this.spreadsheetReady() && this.mapReady()) {
        this.loadAndRenderGyms();
      }
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
    });

    // Custom pane for the current-location dot so it renders above gym markers.
    const locationPane = this.map.createPane(CURRENT_LOCATION_PANE);
    locationPane.style.zIndex = '620';

    L.tileLayer(MAP_CONFIG.tileUrl, {
      attribution: MAP_CONFIG.tileAttribution,
      maxZoom: MAP_CONFIG.maxZoom,
    }).addTo(this.map);

    this.map.on('moveend', () => {
      const c = this.map!.getCenter();
      this.mapCenter.set({ lat: c.lat, lng: c.lng });
    });

    // If location was already resolved before map init, apply it now.
    this.centerMapOnCurrentLocation();

    // Signal that the map is ready; the gym-loading effect will react to this.
    this.mapReady.set(true);
  }

  ngOnDestroy(): void {
    if (this.currentLocationMarker) {
      this.currentLocationMarker.remove();
      this.currentLocationMarker = null;
    }
    this.gymMarkers.forEach(m => m.remove());
    this.gymMarkers = [];
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  openSavePanel(): void {
    this.gymName.set('');
    this.defended.set(false);
    this.defenderPokemon.set('');
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.showSavePanel.set(true);
  }

  cancelSave(): void {
    this.showSavePanel.set(false);
  }

  async saveGym(): Promise<void> {
    const center = this.mapCenter();
    if (!center) {
      this.saveError.set('Map not ready yet.');
      return;
    }

    const name = this.gymName().trim();
    if (!name) {
      this.saveError.set('Gym name is required.');
      return;
    }

    const isDefended = this.defended();
    const gym: GymEntry = {
      id: Date.now().toString(),
      name,
      lat: center.lat,
      lng: center.lng,
      defended: isDefended,
      defendedSince: isDefended ? new Date().toISOString() : undefined,
      defenderPokemon: isDefended ? this.defenderPokemon().trim() || undefined : undefined,
    };

    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.gymRepo.saveGym(gym);
      this.saveSuccess.set(true);
      this.showSavePanel.set(false);
      await this.loadAndRenderGyms();
    } catch (err: any) {
      this.saveError.set(err?.message || 'Failed to save gym.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadAndRenderGyms(): Promise<void> {
    if (!this.map) return;
    try {
      const gyms = await this.gymRepo.loadGyms();
      this.gymMarkers.forEach(m => m.remove());
      this.gymMarkers = [];
      for (const gym of gyms) {
        const marker = L.circleMarker([gym.lat, gym.lng], {
          radius: 8,
          color: '#ffffff',
          weight: 1.5,
          fillColor: gym.defended ? DEFENDED_GYM_COLOR : UNDEFENDED_GYM_COLOR,
          fillOpacity: 0.9,
          interactive: false,
        }).addTo(this.map);
        this.gymMarkers.push(marker);
      }
    } catch {
      // Silently ignore load errors; markers are best-effort.
    }
  }

  /** Re-centres the map on the current GPS position. Called by the UI button. */
  centerToCurrentLocation(): void {
    const state = this.locationState();
    if (state.status === 'located' && this.map) {
      this.map.setView([state.lat, state.lng], this.map.getZoom());
    }
  }

  private centerMapOnCurrentLocation(): void {
    const state = this.locationState();
    if (state.status === 'located' && this.map) {
      if (!this.currentLocationMarker) {
        this.currentLocationMarker = L.circleMarker([state.lat, state.lng], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 1,
          pane: CURRENT_LOCATION_PANE,
        }).addTo(this.map);
      } else {
        this.currentLocationMarker.setLatLng([state.lat, state.lng]);
      }
      if (!this.hasInitialCentered) {
        this.map.setView([state.lat, state.lng], MAP_CONFIG.defaultZoom);
        this.mapCenter.set({ lat: state.lat, lng: state.lng });
        this.hasInitialCentered = true;
      }
    }
  }
}

