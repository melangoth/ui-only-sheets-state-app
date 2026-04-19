import { Injectable, signal } from '@angular/core';
import { GeolocationState } from './geolocation.model';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private _state = signal<GeolocationState>({ status: 'idle' });
  readonly locationState = this._state.asReadonly();

  requestLocation(): void {
    if (!navigator.geolocation) {
      this._state.set({ status: 'error', message: 'Geolocation is not supported by this browser.' });
      return;
    }
    this._state.set({ status: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      pos => {
        this._state.set({
          status: 'located',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      err => {
        this._state.set({ status: 'error', message: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  watchLocation(): () => void {
    if (!navigator.geolocation) {
      this._state.set({ status: 'error', message: 'Geolocation is not supported by this browser.' });
      return () => {};
    }
    this._state.set({ status: 'requesting' });
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        this._state.set({
          status: 'located',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      err => {
        this._state.set({ status: 'error', message: err.message });
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }

  reset(): void {
    this._state.set({ status: 'idle' });
  }
}
