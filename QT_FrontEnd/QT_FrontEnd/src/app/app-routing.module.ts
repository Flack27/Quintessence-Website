import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { GamesComponent } from './pages/games/games.component';
import { RosterComponent } from './pages/roster/roster.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  // Applications live on Qutie - the Apply links point straight there (no local route).
  // Games management is inline on the games page (admin view) - no separate admin route.
  { path: 'games', component: GamesComponent },
  { path: 'roster', component: RosterComponent },

  // Hidden admin entrance - no login button anywhere, admins just know /login.
  { path: 'login', component: LoginComponent },
  // Old admin links now land on the games page where editing happens inline.
  { path: 'menu', redirectTo: 'games', pathMatch: 'full' },
  { path: 'menu/games', redirectTo: 'games', pathMatch: 'full' },
  { path: 'games/:gameId', redirectTo: 'games', pathMatch: 'full' },

  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
