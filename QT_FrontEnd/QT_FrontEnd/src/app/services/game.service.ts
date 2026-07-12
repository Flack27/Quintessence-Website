import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type GameStatus = 'Active' | 'Upcoming' | 'Previous';

export interface PublicGame {
  gameId: number;
  gameName: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  status: GameStatus;
  siteUrl: string | null;
  period: string | null;
  qutieGameId: string | null;   // snowflake-safe string
  pullFromQutie: boolean;
}

export interface GameAchievement {
  achievementId: number;
  icon: string;                  // FontAwesome class, e.g. 'fa-crown'
  title: string;
  description: string | null;
}

export interface GameGalleryItem {
  itemId: number;
  itemType: 'image' | 'video';
  imageUrl: string | null;
  youtubeId: string | null;
  caption: string | null;
}

export interface GameDetails {
  gameId: number;
  gameName: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  status: GameStatus;
  period: string | null;
  players: string | null;
  fullStory: string | null;
  pullFromQutie: boolean;
  qutieGameId: string | null;
  achievements: GameAchievement[];
  gallery: GameGalleryItem[];
}

export interface AdminGame extends PublicGame {
  players: string | null;
  fullStory: string | null;
}

export interface TimelineEntry {
  entryId: number;
  period: string;
  title: string;
  description: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  constructor(private http: HttpClient) { }

  // ----- Public -----

  getPublicGames(): Observable<PublicGame[]> {
    return this.http.get<PublicGame[]>('/api/games/public');
  }

  getGameDetails(gameId: number): Observable<GameDetails> {
    return this.http.get<GameDetails>(`/api/games/${gameId}/details`);
  }

  getTimeline(): Observable<TimelineEntry[]> {
    return this.http.get<TimelineEntry[]>('/api/timeline');
  }

  // ----- Admin: games -----

  getAdminGames(): Observable<AdminGame[]> {
    return this.http.get<AdminGame[]>('/api/menu/games', { withCredentials: true });
  }

  createGame(gameName: string): Observable<AdminGame> {
    return this.http.post<AdminGame>('/api/menu/games', { gameName }, { withCredentials: true });
  }

  updateGame(game: AdminGame): Observable<any> {
    // Images are managed via the upload endpoint; ids stay strings (snowflake-safe).
    const payload = {
      gameName: game.gameName,
      status: game.status,
      description: game.description,
      siteUrl: game.siteUrl,
      period: game.period,
      players: game.players,
      fullStory: game.fullStory,
      pullFromQutie: game.pullFromQutie,
      qutieGameId: game.qutieGameId
    };
    return this.http.put(`/api/menu/games/${game.gameId}`, payload, { withCredentials: true });
  }

  deleteGame(gameId: number): Observable<any> {
    return this.http.delete(`/api/menu/games/${gameId}`, { withCredentials: true });
  }

  /** Persist a new game order (ids as strings, in display order). */
  reorderGames(gameIds: string[]): Observable<any> {
    return this.http.put('/api/menu/games/order', { gameIds }, { withCredentials: true });
  }

  uploadGameImage(gameId: number, type: 'card' | 'banner', file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`/api/menu/games/${gameId}/image?type=${type}`, formData, { withCredentials: true });
  }

  // ----- Admin: achievements (past-game popup) -----

  addAchievement(gameId: number, icon: string, title: string, description: string | null): Observable<GameAchievement> {
    return this.http.post<GameAchievement>(`/api/menu/games/${gameId}/achievements`,
      { icon, title, description }, { withCredentials: true });
  }

  deleteAchievement(gameId: number, achievementId: number): Observable<any> {
    return this.http.delete(`/api/menu/games/${gameId}/achievements/${achievementId}`, { withCredentials: true });
  }

  // ----- Admin: gallery (past-game popup) -----

  uploadGalleryImage(gameId: number, file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`/api/menu/games/${gameId}/gallery/upload`, formData, { withCredentials: true });
  }

  addGalleryItem(gameId: number, item: { itemType: 'image' | 'video'; imageUrl?: string | null; youtubeId?: string | null; caption?: string | null }): Observable<GameGalleryItem> {
    return this.http.post<GameGalleryItem>(`/api/menu/games/${gameId}/gallery`, item, { withCredentials: true });
  }

  deleteGalleryItem(gameId: number, itemId: number): Observable<any> {
    return this.http.delete(`/api/menu/games/${gameId}/gallery/${itemId}`, { withCredentials: true });
  }

  // ----- Admin: guild timeline -----

  addTimelineEntry(period: string, title: string, description: string | null): Observable<TimelineEntry> {
    return this.http.post<TimelineEntry>('/api/timeline', { period, title, description }, { withCredentials: true });
  }

  deleteTimelineEntry(entryId: number): Observable<any> {
    return this.http.delete(`/api/timeline/${entryId}`, { withCredentials: true });
  }
}
