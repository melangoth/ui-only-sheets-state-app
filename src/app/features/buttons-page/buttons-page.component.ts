import { Component } from '@angular/core';
import { ButtonBoardComponent } from '../button-board/button-board.component';

@Component({
  selector: 'app-buttons-page',
  standalone: true,
  imports: [ButtonBoardComponent],
  templateUrl: './buttons-page.component.html',
})
export class ButtonsPageComponent {}
