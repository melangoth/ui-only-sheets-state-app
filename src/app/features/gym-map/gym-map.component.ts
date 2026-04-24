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

  showSavePanel = signal(false);
  gymName = signal('');
  defended = signal(false);
  defenderPokemon = signal('');
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  constructor() {
    // Re-centre the map when location updates — no marker per design.
    effect(() => {
      const state = this.locationState();
      if (state.status === 'located' && this.map) {
        this.map.setView([state.lat, state.lng], MAP_CONFIG.defaultZoom);
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
  }

  ngOnDestroy(): void {
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
    const loc = this.locationState();
    if (loc.status !== 'located') return;

    const name = this.gymName().trim();
    if (!name) {
      this.saveError.set('Gym name is required.');
      return;
    }

    const isDefended = this.defended();
    const gym: GymEntry = {
      id: Date.now().toString(),
      name,
      lat: loc.lat,
      lng: loc.lng,
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
    } catch (err: any) {
      this.saveError.set(err?.message || 'Failed to save gym.');
    } finally {
      this.saving.set(false);
    }
  }
}

