import { Component, OnDestroy, AfterViewInit, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { StorageFileService } from './core/storage/storage-file.service';
import { GeolocationService } from './core/geolocation/geolocation.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private storageFile = inject(StorageFileService);
  private geo = inject(GeolocationService);

  readonly requireAppLogin = environment.requireAppLogin;
  readonly enableClearCredentialsButton = environment.enableClearCredentialsButton;

  navOpen = signal(false);
  spreadsheetError = signal<string | null>(null);

  private stopGeoWatch: (() => void) | null = null;

  constructor() {
    // When the user signs in, resolve the spreadsheet so all screens share one resolved ID.
    effect(() => {
      if (this.auth.isSignedIn()) {
        this.initializeStorage();
      }
    });
  }

  ngAfterViewInit(): void {
    // Defer so the *ngIf on the sign-in button has time to render the element.
    setTimeout(() => this.auth.initializeSignIn('google-sign-in-button'), 0);

    // Start watching location app-wide so all screens share the same position.
    this.stopGeoWatch = this.geo.watchLocation();
  }

  ngOnDestroy(): void {
    if (this.stopGeoWatch) {
      this.stopGeoWatch();
      this.stopGeoWatch = null;
    }
  }

  clearCredentials(): void {
    this.auth.clearCredentials();
    setTimeout(() => this.auth.initializeSignIn('google-sign-in-button'), 0);
  }

  private async initializeStorage(): Promise<void> {
    try {
      this.spreadsheetError.set(null);
      await this.storageFile.resolveSpreadsheet();
    } catch (err: any) {
      this.spreadsheetError.set(err?.message || 'Failed to resolve storage spreadsheet.');
    }
  }
}


