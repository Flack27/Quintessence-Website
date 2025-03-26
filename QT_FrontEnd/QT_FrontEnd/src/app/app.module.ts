import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavComponent } from './components/navbar/navbar.component';
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
import { EventlistComponent } from './pages/menu/events/eventlist/eventlist.component';
import { SignupsComponent } from './pages/menu/events/eventlist/signups/signups.component';
import { FormComponent } from './pages/menu/forms/form/form.component';
import { ApplyComponent } from './pages/apply/apply.component';
import { ThanksComponent } from './pages/apply/thanks/thanks.component';
import { SubmissionComponent } from './pages/menu/submissions/submission/submission.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { GamesComponent } from './pages/games/games.component';
import { RosterComponent } from './pages/roster/roster.component';
import { AutomationComponent } from './pages/menu/automation/automation.component';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    HomeComponent,
    MenuComponent,
    MessagesComponent,
    VoiceComponent,
    EventsComponent,
    XpconfigComponent,
    EventsconfigComponent,
    ReactionconfigComponent,
    FormsComponent,
    SubmissionsComponent,
    EventlistComponent,
    SignupsComponent,
    FormComponent,
    ApplyComponent,
    ThanksComponent,
    SubmissionComponent,
    ProfileComponent,
    GamesComponent,
    RosterComponent,
    AutomationComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
