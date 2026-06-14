import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GymEntry } from '../../models/gym.model';
import { GymRepository } from '../../../core/storage/gym.repository';

@Component({
  selector: 'app-gym-edit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gym-edit-panel.component.html',
  styleUrls: ['./gym-edit-panel.component.css'],
})
export class GymEditPanelComponent implements OnChanges, AfterViewChecked {
  @ViewChild('defenderPokemonInput') defenderPokemonInput?: ElementRef<HTMLInputElement>;

  @Input() gym!: GymEntry;
  @Input() enableDefender = false;
  @Input() focusDefenderPokemon = false;
  @Output() saved = new EventEmitter<GymEntry>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private gymRepo = inject(GymRepository);

  editName = signal('');
  editDefended = signal(false);
  editDefenderPokemon = signal('');
  editSaving = signal(false);
  editError = signal<string | null>(null);
  private shouldFocusDefenderPokemon = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gym'] && this.gym) {
      this.editName.set(this.gym.name);
      this.editDefended.set(this.gym.defended);
      this.editDefenderPokemon.set(this.gym.defenderPokemon ?? '');
      this.editError.set(null);
    }

    if (this.enableDefender) {
      this.editDefended.set(true);
    }

    if (this.focusDefenderPokemon && this.editDefended()) {
      this.shouldFocusDefenderPokemon = true;
    }
  }

  ngAfterViewChecked(): void {
    if (!this.shouldFocusDefenderPokemon || !this.defenderPokemonInput) {
      return;
    }

    this.defenderPokemonInput.nativeElement.focus();
    this.shouldFocusDefenderPokemon = false;
  }

  async saveEdit(): Promise<void> {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set('Gym name is required.');
      return;
    }

    const isDefended = this.editDefended();
    const updated: GymEntry = {
      ...this.gym,
      name,
      defended: isDefended,
      defendedSince: isDefended
        ? (this.gym.defended ? this.gym.defendedSince : new Date().toISOString())
        : undefined,
      defenderPokemon: isDefended ? this.editDefenderPokemon().trim() || undefined : undefined,
    };

    this.editSaving.set(true);
    this.editError.set(null);
    try {
      await this.gymRepo.updateGym(updated);
      this.saved.emit(updated);
    } catch (err: any) {
      this.editError.set(err?.message || 'Failed to save changes.');
    } finally {
      this.editSaving.set(false);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  requestDelete(): void {
    this.deleteRequested.emit();
  }
}
