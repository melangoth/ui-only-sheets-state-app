import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { StorageFileService } from '../../core/storage/storage-file.service';
import { ButtonStateRepository } from '../../core/storage/button-state.repository';
import { BUTTON_CONFIG, ButtonDefinition } from '../../shared/config/button-config';
import { ColorButtonState, ColorKey } from '../../shared/models/button-state.model';

type BoardStatus =
  | 'idle'
  | 'requesting-access'
  | 'loading-states'
  | 'ready'
  | 'saving'
  | 'refreshing'
  | 'error';

@Component({
  selector: 'app-button-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button-board.component.html',
  styleUrls: ['./button-board.component.css'],
})
export class ButtonBoardComponent implements OnInit {
  private auth = inject(AuthService);
  private storageFile = inject(StorageFileService);
  private repo = inject(ButtonStateRepository);

  readonly buttonConfig = BUTTON_CONFIG;

  private _boardStatus = signal<BoardStatus>('idle');
  private _states = signal<ColorButtonState[]>([]);
  private _errorMessage = signal<string | null>(null);
  private _savingKey = signal<ColorKey | null>(null);

  readonly boardStatus = this._boardStatus.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isLoading = computed(() =>
    ['requesting-access', 'loading-states'].includes(this._boardStatus())
  );
  readonly isSaving = computed(() => this._boardStatus() === 'saving');
  readonly isRefreshing = computed(() => this._boardStatus() === 'refreshing');

  getState(colorKey: ColorKey): ColorButtonState | undefined {
    return this._states().find(s => s.colorKey === colorKey);
  }

  isButtonDisabled(colorKey: ColorKey): boolean {
    return this.isLoading() || this.isSaving() || this.isRefreshing();
  }

  getStatusMessage(): string {
    switch (this._boardStatus()) {
      case 'requesting-access': return 'Requesting Google access...';
      case 'loading-states': return 'Loading saved states...';
      case 'saving': return 'Saving...';
      case 'refreshing': return 'Refreshing states...';
      default: return '';
    }
  }

  async ngOnInit(): Promise<void> {
    await this.initializeBoard();
  }

  async initializeBoard(): Promise<void> {
    this._errorMessage.set(null);
    try {
      this._boardStatus.set('requesting-access');
      await this.auth.requestAccessToken();
      // Spreadsheet is resolved app-wide; this is a no-op if the app shell already resolved it.
      await this.storageFile.resolveSpreadsheet();

      this._boardStatus.set('loading-states');
      const states = await this.repo.loadStates();
      this._states.set(states);

      this._boardStatus.set('ready');
    } catch (err: any) {
      this._boardStatus.set('error');
      this._errorMessage.set(err?.message || 'An unexpected error occurred.');
    }
  }

  async toggleButton(def: ButtonDefinition): Promise<void> {
    if (this.isButtonDisabled(def.colorKey)) return;

    const currentState = this.getState(def.colorKey);
    if (!currentState) return;

    const nextLabel = currentState.labelState === 'Passive' ? 'Active' : 'Passive';
    const newState: ColorButtonState = { colorKey: def.colorKey, labelState: nextLabel };

    this._boardStatus.set('saving');
    this._savingKey.set(def.colorKey);
    this._errorMessage.set(null);

    try {
      await this.repo.saveState(newState);
      // Reload all states so any changes from other devices are also reflected
      const states = await this.repo.loadStates();
      this._states.set(states);
      this._boardStatus.set('ready');
    } catch (err: any) {
      this._boardStatus.set('error');
      this._errorMessage.set(`Save failed: ${err?.message || 'Unknown error'}. Please retry.`);
    } finally {
      this._savingKey.set(null);
    }
  }

  async refreshStates(): Promise<void> {
    if (this._boardStatus() !== 'ready') return;

    this._boardStatus.set('refreshing');
    this._errorMessage.set(null);

    try {
      const states = await this.repo.loadStates();
      this._states.set(states);
      this._boardStatus.set('ready');
    } catch (err: any) {
      this._boardStatus.set('error');
      this._errorMessage.set(`Refresh failed: ${err?.message || 'Unknown error'}. Please retry.`);
    }
  }

  async retryInit(): Promise<void> {
    await this.initializeBoard();
  }
}
