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
    // Re-initialize sign-in after clearing so the button is rendered again
    setTimeout(() => this.auth.initializeSignIn('google-sign-in-button'), 0);
  }
}

