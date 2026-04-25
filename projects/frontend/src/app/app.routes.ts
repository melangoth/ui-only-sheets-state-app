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
  {
    path: 'defenders',
    loadComponent: () =>
      import('./features/defenders-page/defenders-page.component').then(m => m.DefendersPageComponent),
  },
];
