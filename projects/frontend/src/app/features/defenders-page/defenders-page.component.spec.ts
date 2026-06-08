import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DefendersPageComponent } from './defenders-page.component';
import { GymRepository } from '../../core/storage/gym.repository';
import { GeolocationService } from '../../core/geolocation/geolocation.service';
import { GymEntry } from '../../shared/models/gym.model';

describe('DefendersPageComponent', () => {
  const gyms: GymEntry[] = [
    {
      id: 'gym-1',
      name: 'Blue Gym',
      lat: 1,
      lng: 1,
      defended: false,
    },
    {
      id: 'gym-2',
      name: 'Green Gym',
      lat: 1.0005,
      lng: 1.0005,
      defended: true,
      defendedSince: '2026-06-08T00:00:00.000Z',
      defenderPokemon: 'Blissey',
    },
  ];

  const gymRepositoryStub = {
    loadGyms: vi.fn<() => Promise<GymEntry[]>>(),
    updateGym: vi.fn<() => Promise<void>>(),
    deleteGym: vi.fn<() => Promise<void>>(),
  };

  const geolocationServiceStub = {
    locationState: signal({ status: 'located' as const, lat: 1, lng: 1 }),
  };

  beforeEach(async () => {
    gymRepositoryStub.loadGyms.mockResolvedValue(structuredClone(gyms));
    gymRepositoryStub.updateGym.mockResolvedValue();
    gymRepositoryStub.deleteGym.mockResolvedValue();

    await TestBed.configureTestingModule({
      imports: [DefendersPageComponent],
      providers: [
        { provide: GymRepository, useValue: gymRepositoryStub },
        { provide: GeolocationService, useValue: geolocationServiceStub },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function createComponent() {
    const fixture = TestBed.createComponent(DefendersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the quick defend shortcut only for undefended gyms', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.activeFilter.set('nearby');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const quickDefendButtons = compiled.querySelectorAll('button[title="Quick defend"]');
    expect(quickDefendButtons).toHaveLength(1);
    expect(compiled.textContent).toContain('Blue Gym');
    expect(compiled.textContent).toContain('Green Gym');
    expect(compiled.querySelector('button[title="Delete"]')).toBeNull();
  });

  it('opens edit mode with the defender input focused from the quick shortcut', async () => {
    const fixture = await createComponent();
    fixture.componentInstance.activeFilter.set('nearby');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const quickDefendButton = compiled.querySelector('button[title="Quick defend"]') as HTMLButtonElement;
    quickDefendButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const defenderPokemonInput = compiled.querySelector(
      'input[placeholder="e.g. Blissey"]'
    ) as HTMLInputElement;

    expect(defenderPokemonInput).toBeTruthy();
    expect(document.activeElement).toBe(defenderPokemonInput);
    expect(compiled.querySelector('button[title="Delete"]')).toBeTruthy();
  });
});
