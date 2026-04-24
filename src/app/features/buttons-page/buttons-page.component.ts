import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonBoardComponent } from '../button-board/button-board.component';

@Component({
  selector: 'app-buttons-page',
  standalone: true,
  imports: [CommonModule, ButtonBoardComponent],
  templateUrl: './buttons-page.component.html',
})
export class ButtonsPageComponent {
  auth = inject(AuthService);
}
