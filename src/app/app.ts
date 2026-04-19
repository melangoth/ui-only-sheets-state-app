import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth/auth.service';
import { ButtonBoardComponent } from './features/button-board/button-board.component';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ButtonBoardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  auth = inject(AuthService);
  readonly requireAppLogin = environment.requireAppLogin;
  readonly enableClearCredentialsButton = environment.enableClearCredentialsButton;

  ngOnInit(): void {
    this.auth.initializeSignIn('google-sign-in-button');
  }

  clearCredentials(): void {
    this.auth.clearCredentials();
    // Defer re-initialization until Angular's next change-detection cycle so the
    // *ngIf on the sign-in section has time to re-render the #google-sign-in-button
    // element before initializeSignIn() tries to attach to it.
    setTimeout(() => this.auth.initializeSignIn('google-sign-in-button'), 0);
  }
}

