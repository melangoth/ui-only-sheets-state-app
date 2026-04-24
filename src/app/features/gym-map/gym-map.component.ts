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

    // Load and render saved gym markers once the spreadsheet is ready; guard
    // against re-running if the signal toggles again.
    let gymsLoaded = false;
    effect(() => {
      if (this.spreadsheetReady() && this.map && !gymsLoaded) {
        gymsLoaded = true;
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

  private centerMapOnCurrentLocation(): void {
    const state = this.locationState();
    if (state.status === 'located' && this.map) {
      if (!this.currentLocationMarker) {
        this.currentLocationMarker = L.circleMarker([state.lat, state.lng], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: '#7e22ce',
          fillOpacity: 1,
        }).addTo(this.map);
      } else {
        this.currentLocationMarker.setLatLng([state.lat, state.lng]);
      }
      this.map.setView([state.lat, state.lng], MAP_CONFIG.defaultZoom);
      this.mapCenter.set({ lat: state.lat, lng: state.lng });
    }
  }
}

