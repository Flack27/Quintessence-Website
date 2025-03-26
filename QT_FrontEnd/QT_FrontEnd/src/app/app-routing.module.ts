import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminGuard } from './services/admin.guard';
import { ApplyGuard } from './services/apply.guard';

import { HomeComponent } from './pages/home/home.component';
import { MenuComponent } from './pages/menu/menu.component';
import { MessagesComponent } from './pages/menu/messages/messages.component';
import { VoiceComponent } from './pages/menu/voice/voice.component';
import { EventsComponent } from './pages/menu/events/events.component';
import { XpconfigComponent } from './pages/menu/xpconfig/xpconfig.component';
import { EventsconfigComponent } from './pages/menu/eventsconfig/eventsconfig.component';
import { ReactionconfigComponent } from './pages/menu/reactionconfig/reactionconfig.component';
import { FormsComponent } from './pages/menu/forms/forms.component';
import { SubmissionsComponent } from './pages/menu/submissions/submissions.component';
import { SubmissionComponent } from './pages/menu/submissions/submission/submission.component'
import { EventlistComponent } from './pages/menu/events/eventlist/eventlist.component';
import { SignupsComponent } from './pages/menu/events/eventlist/signups/signups.component';
import { FormComponent } from './pages/menu/forms/form/form.component';
import { ApplyComponent } from './pages/apply/apply.component';
import { ThanksComponent } from './pages/apply/thanks/thanks.component';
import { ProfileComponent } from './pages/profile/profile.component'
import { GamesComponent } from './pages/games/games.component'
import { RosterComponent } from './pages/roster/roster.component'
import { AutomationComponent } from './pages/menu/automation/automation.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'apply', component: ApplyComponent, canActivate: [ApplyGuard] },
  { path: 'apply/thank-you', component: ThanksComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'games', component: GamesComponent },
  { path: 'roster', component: RosterComponent },

  { path: 'menu', component: MenuComponent, canActivate: [adminGuard] },
  { path: 'menu/automation', component: AutomationComponent, canActivate: [adminGuard] },
  { path: 'menu/messages', component: MessagesComponent, canActivate: [adminGuard] },
  { path: 'menu/voice', component: VoiceComponent, canActivate: [adminGuard] },
  { path: 'menu/events', component: EventsComponent, canActivate: [adminGuard] },
  { path: 'menu/events/:id', component: EventlistComponent, canActivate: [adminGuard] },
  { path: 'menu/events/:id/:eventId', component: SignupsComponent, canActivate: [adminGuard] },
  { path: 'menu/xpconfig', component: XpconfigComponent, canActivate: [adminGuard] },
  { path: 'menu/eventsconfig', component: EventsconfigComponent, canActivate: [adminGuard] },
  { path: 'menu/reactionconfig', component: ReactionconfigComponent, canActivate: [adminGuard] },
  { path: 'menu/forms', component: FormsComponent, canActivate: [adminGuard] },
  { path: 'menu/forms/:formId', component: FormComponent, canActivate: [adminGuard] },
  { path: 'menu/submissions', component: SubmissionsComponent, canActivate: [adminGuard] },
  { path: 'menu/submissions/:submissionId', component: SubmissionComponent, canActivate: [adminGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
