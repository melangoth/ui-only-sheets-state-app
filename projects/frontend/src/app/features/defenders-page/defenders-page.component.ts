import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GymRepository } from '../../core/storage/gym.repository';
import { GeolocationService } from '../../core/geolocation/geolocation.service';
import { GymEntry } from '../../shared/models/gym.model';
import { haversineDistanceMeters } from '../../shared/utils/distance';
import { GymEditPanelComponent } from '../../shared/components/gym-edit-panel/gym-edit-panel.component';

type PageStatus = 'idle' | 'loading' | 'ready' | 'error';
type ActiveFilter = 'defending' | 'nearby';

@Component({
  selector: 'app-defenders-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GymEditPanelComponent],
  templateUrl: './defenders-page.component.html',
  styleUrls: ['./defenders-page.component.css'],
})
export class DefendersPageComponent implements OnInit {
  private gymRepo = inject(GymRepository);
  private geo = inject(GeolocationService);

  readonly locationState = this.geo.locationState;

  private _status = signal<PageStatus>('idle');
  private _gyms = signal<GymEntry[]>([]);
  private _errorMessage = signal<string | null>(null);

  readonly pageStatus = this._status.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  activeFilter = signal<ActiveFilter>('defending');

  // Gym being edited (null = no edit in progress)
  editingGym = signal<GymEntry | null>(null);
  enableDefenderOnEdit = signal(false);
  focusDefenderPokemonOnEdit = signal(false);

  // Delete confirmation
  deletingGymId = signal<string | null>(null);
  deleteInProgress = signal(false);
  deleteError = signal<string | null>(null);

  readonly defendingGyms = computed(() => this._gyms().filter(g => g.defended));

  readonly nearbyGyms = computed(() => {
    const loc = this.locationState();
    if (loc.status !== 'located') return [];
    return this._gyms().filter(
      g => haversineDistanceMeters(loc.lat, loc.lng, g.lat, g.lng) <= 500
    );
  });

  readonly displayedGyms = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'defending') {
      const defending = this.defendingGyms();
      // Smart fallback: show nearby when defending list is empty
      return defending.length > 0 ? defending : this.nearbyGyms();
    }
    return this.nearbyGyms();
  });

  readonly effectiveFilter = computed<ActiveFilter>(() => {
    if (this.activeFilter() === 'defending' && this.defendingGyms().length === 0) {
      return 'nearby';
    }
    return this.activeFilter();
  });

  async ngOnInit(): Promise<void> {
    await this.loadGyms();
  }

  async loadGyms(): Promise<void> {
    this._status.set('loading');
    this._errorMessage.set(null);
    try {
      const gyms = await this.gymRepo.loadGyms();
      this._gyms.set(gyms);
      this._status.set('ready');
    } catch (err: any) {
      this._status.set('error');
      this._errorMessage.set(err?.message || 'Failed to load gyms.');
    }
  }

  startEdit(gym: GymEntry): void {
    this.enableDefenderOnEdit.set(false);
    this.focusDefenderPokemonOnEdit.set(false);
    this.editingGym.set(gym);
  }

  startDefenderEdit(gym: GymEntry): void {
    this.enableDefenderOnEdit.set(true);
    this.focusDefenderPokemonOnEdit.set(true);
    this.editingGym.set(gym);
  }

  cancelEdit(): void {
    this.editingGym.set(null);
    this.enableDefenderOnEdit.set(false);
    this.focusDefenderPokemonOnEdit.set(false);
    this.cancelDelete();
  }

  onGymSaved(updatedGym: GymEntry): void {
    this._gyms.update(gyms => gyms.map(g => (g.id === updatedGym.id ? updatedGym : g)));
    this.editingGym.set(null);
    this.enableDefenderOnEdit.set(false);
    this.focusDefenderPokemonOnEdit.set(false);
  }

  confirmDelete(gymId: string): void {
    this.deletingGymId.set(gymId);
    this.deleteError.set(null);
  }

  cancelDelete(): void {
    this.deletingGymId.set(null);
    this.deleteError.set(null);
  }

  async executeDelete(gymId: string): Promise<void> {
    this.deleteInProgress.set(true);
    this.deleteError.set(null);
    try {
      await this.gymRepo.deleteGym(gymId);
      this._gyms.update(gyms => gyms.filter(g => g.id !== gymId));
      this.deletingGymId.set(null);
    } catch (err: any) {
      this.deleteError.set(err?.message || 'Failed to delete gym.');
    } finally {
      this.deleteInProgress.set(false);
    }
  }
}
