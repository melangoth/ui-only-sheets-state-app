import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth/auth.service';
import { ButtonBoardComponent } from './features/button-board/button-board.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ButtonBoardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.initializeSignIn('google-sign-in-button');
  }
}
