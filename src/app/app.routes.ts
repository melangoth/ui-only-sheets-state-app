import { Routes } from '@angular/router';
import { ButtonsPageComponent } from './features/buttons-page/buttons-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'buttons', pathMatch: 'full' },
  { path: 'buttons', component: ButtonsPageComponent },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/gym-map/gym-map.component').then(m => m.GymMapComponent),
  },
];
