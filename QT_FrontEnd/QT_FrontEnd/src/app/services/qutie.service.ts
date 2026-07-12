import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Client for Qutie data, served through OUR OWN backend proxy at /api/qutie
 * (the API key lives server-side; see QutieController). Shapes match the built
 * Qutie public API (Qutie/docs/design/public-api.md). Every call swallows errors
 * and resolves to null so Qutie-fed sections degrade gracefully.
 */

// GET /api/qutie/games  ->  Qutie GET /api/v1/games (bare array)
export interface QutieGame {
  gameId: string;
  gameName: string;
  emoji: string | null;
  color: string | null;
  isArchived: boolean;
  hasRoster: boolean;
}

// GET /api/qutie/games/{gameId}/members  ->  { members:[...], total }
export interface QutieGameMember {
  memberKey: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  rosterRoles: string[];
  isTrial: boolean;
  joined: string | null;
  fields: { [key: string]: string };
  attendancePercent: number | null;
  eventsAttended: number;
  eventsEligible: number;
}

// GET /api/qutie/games/{gameId}/events  ->  { events:[...], total }
export interface QutieEvent {
  eventId: string;
  title: string;
  startAt: string;          // UTC ISO
  endAt: string | null;
  channelId: string;
  gameId: string | null;
  dkp: number;
  status: string;
  signupCount: number;
  vodCount: number;         // an event has many VODs - fetch them per event
}

// GET /api/qutie/events/{eventId}/vods  ->  { data:[...], total }
export interface QutieVod {
  vodId: string;
  url: string;
  memberKey: string;
  submittedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class QutieService {
  constructor(private http: HttpClient) { }

  /** The guild's games in Qutie (drives the admin game-link picker). */
  getGames(): Observable<QutieGame[] | null> {
    return this.http.get<QutieGame[]>('/api/qutie/games').pipe(catchError(() => of(null)));
  }

  /** Per-game roster with aggregate attendance (active-game roster section). */
  getGameMembers(qutieGameId: string): Observable<QutieGameMember[] | null> {
    return this.http.get<{ members: QutieGameMember[] }>(`/api/qutie/games/${qutieGameId}/members`)
      .pipe(map(r => r.members ?? []), catchError(() => of(null)));
  }

  /** A game's event history (the events graph on past-game popups). Events carry vodCount. */
  getGameEvents(qutieGameId: string): Observable<QutieEvent[] | null> {
    return this.http.get<{ events: QutieEvent[] }>(`/api/qutie/games/${qutieGameId}/events`)
      .pipe(map(r => r.events ?? []), catchError(() => of(null)));
  }

  /** The VODs submitted for one event (opened when a graph point is clicked). */
  getEventVods(eventId: string): Observable<QutieVod[] | null> {
    return this.http.get<{ data: QutieVod[] }>(`/api/qutie/events/${eventId}/vods`)
      .pipe(map(r => r.data ?? []), catchError(() => of(null)));
  }
}
