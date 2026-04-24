import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  auth = inject(AuthService);
  readonly requireAppLogin = environment.requireAppLogin;
  readonly enableClearCredentialsButton = environment.enableClearCredentialsButton;

  ngAfterViewInit(): void {
    // Defer so the *ngIf="!auth.isSignedIn()" block has time to render the
    // #google-sign-in-button element before GIS tries to attach to it.
    setTimeout(() => this.auth.initializeSignIn('google-sign-in-button'), 0);
  }

  clearCredentials(): void {
    this.auth.clearCredentials();
    // Defer re-initialization until Angular's next change-detection cycle so the
    // *ngIf on the sign-in section has time to re-render the #google-sign-in-button
    // element before initializeSignIn() tries to attach to it.
    setTimeout(() => this.auth.initializeSignIn('google-sign-in-button'), 0);
  }
}

