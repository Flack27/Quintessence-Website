import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService } from '../../services/auth.service';
import {
  GameService, AdminGame, PublicGame, GameDetails, GameAchievement, GameGalleryItem, TimelineEntry
} from '../../services/game.service';
import { QutieService, QutieGame, QutieEvent } from '../../services/qutie.service';

/** One month column of the events graph. */
interface GraphMonth {
  label: string;
  x: number; y: number; w: number; h: number;
  count: number;
}

/** One clickable VOD dot on the events graph. */
interface GraphDot {
  cx: number; cy: number;
  event: QutieEvent;
}

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  encapsulation: ViewEncapsulation.None
})
export class GamesComponent implements OnInit {

  games: AdminGame[] = [];
  timeline: TimelineEntry[] = [];
  activeTab: 'upcoming' | 'prior' = 'upcoming';

  isAdmin = false;

  // ----- Details popup -----
  details: GameDetails | null = null;
  detailsLoading = false;
  qutieEvents: QutieEvent[] | null = null;   // null = section hidden (not pulled / unavailable)

  // Events graph geometry (computed from qutieEvents)
  graphMonths: GraphMonth[] = [];
  graphDots: GraphDot[] = [];
  graphW = 0;
  readonly graphH = 200;
  graphGridLines: { y: number; label: number }[] = [];

  // ----- Video / image overlays -----
  video: { youtubeId: string; title: string; subtitle: string } | null = null;
  videoSrc: SafeResourceUrl | null = null;   // set once per video so the iframe doesn't reload every CD cycle
  fullscreenImage: { src: string; alt: string } | null = null;

  // ----- Admin: game editor overlay -----
  editorOpen = false;
  editorGame: AdminGame | null = null;   // working copy; gameId 0 = new game
  editorSaving = false;
  qutieGames: QutieGame[] | null = null; // null = Qutie API unavailable -> manual id input

  // ----- Admin: inline forms -----
  readonly achievementIcons = [
    'fa-crown', 'fa-skull', 'fa-medal', 'fa-trophy', 'fa-shield-alt', 'fa-flag',
    'fa-coins', 'fa-users', 'fa-fire', 'fa-star', 'fa-chess-rook', 'fa-bolt'
  ];
  newAchievement = { icon: 'fa-medal', title: '', description: '' };
  newGallery: { itemType: 'image' | 'video'; youtubeUrl: string; caption: string; file: File | null } =
    { itemType: 'image', youtubeUrl: '', caption: '', file: null };
  galleryUploading = false;
  newTimelineEntry = { period: '', title: '', description: '' };
  showTimelineForm = false;

  statusMessage = '';
  errorMessage = '';

  constructor(
    private gameService: GameService,
    private qutieService: QutieService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.authService.isAdmin$.subscribe(isAdmin => {
      const was = this.isAdmin;
      this.isAdmin = isAdmin === true;
      if (this.isAdmin && !was) {
        this.loadGames();
        this.qutieService.getGames().subscribe(games => this.qutieGames = games);
      }
    });

    this.loadGames();
    this.gameService.getTimeline().subscribe({
      next: entries => this.timeline = entries,
      error: () => { /* timeline simply stays empty */ }
    });
  }

  loadGames(): void {
    const source$ = this.isAdmin ? this.gameService.getAdminGames() : this.gameService.getPublicGames();
    source$.subscribe({
      next: games => {
        // The public payload lacks players/fullStory - only the admin editor needs them.
        this.games = games.map(g => ({ players: null, fullStory: null, ...g } as AdminGame));
      },
      error: () => { /* card sections simply stay empty */ }
    });
  }

  // Imageless games still show publicly (the template renders a placeholder card);
  // a game shouldn't be invisible just because no card art was uploaded yet.
  get activeGames(): AdminGame[] {
    return this.games.filter(g => g.status !== 'Previous');
  }

  get archivedGames(): AdminGame[] {
    return this.games.filter(g => g.status === 'Previous');
  }

  setTab(tab: 'upcoming' | 'prior'): void {
    this.activeTab = tab;
  }

  openSite(game: PublicGame, event: Event): void {
    event.stopPropagation();
    if (game.siteUrl) {
      window.open(game.siteUrl, '_blank');
    }
  }

  /** Drag-reorder active games (admin); archived keep their relative order at the end. */
  onGameDrop(event: CdkDragDrop<AdminGame[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const active = this.activeGames;
    moveItemInArray(active, event.previousIndex, event.currentIndex);
    this.games = [...active, ...this.archivedGames];

    this.gameService.reorderGames(this.games.map(g => g.gameId.toString())).subscribe({
      next: () => { this.errorMessage = ''; },
      error: () => this.errorMessage = 'Failed to save game order.'
    });
  }

  // ==================== Details popup (prior games) ====================

  openDetails(game: PublicGame): void {
    if (game.status !== 'Previous') return;

    this.details = null;
    this.detailsLoading = true;
    this.qutieEvents = null;
    this.graphMonths = [];
    this.graphDots = [];
    document.body.style.overflow = 'hidden';

    this.gameService.getGameDetails(game.gameId).subscribe({
      next: details => {
        this.details = details;
        this.detailsLoading = false;
        if (details.pullFromQutie && details.qutieGameId) {
          this.qutieService.getGameEvents(details.qutieGameId).subscribe(events => {
            if (events && events.length > 0) {
              this.qutieEvents = events;
              this.buildGraph(events);
            }
          });
        }
      },
      error: () => {
        this.detailsLoading = false;
        document.body.style.overflow = '';
      }
    });
  }

  closeDetails(): void {
    this.details = null;
    this.detailsLoading = false;
    document.body.style.overflow = '';
  }

  /** How many events have at least one VOD. */
  get vodCount(): number {
    return (this.qutieEvents ?? []).filter(e => e.vodCount > 0).length;
  }

  /** Buckets events into calendar months and lays out bars + VOD dots. */
  private buildGraph(events: QutieEvent[]): void {
    const padL = 34, padR = 14, padT = 12, padB = 30, slot = 84;
    const ih = this.graphH - padT - padB;

    const sorted = [...events].sort((a, b) => a.startAt.localeCompare(b.startAt));
    const first = new Date(sorted[0].startAt);
    const last = new Date(sorted[sorted.length - 1].startAt);

    const months: { key: string; label: string; count: number }[] = [];
    const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
    const end = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    while (cursor <= end && months.length < 60) {
      const key = `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`;
      months.push({ key, label: `${names[cursor.getUTCMonth()]} ${cursor.getUTCFullYear() % 100}`, count: 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    const index = new Map(months.map((m, i) => [m.key, i]));
    for (const e of sorted) {
      const d = new Date(e.startAt);
      const i = index.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
      if (i !== undefined) months[i].count++;
    }

    const max = Math.max(4, ...months.map(m => m.count));
    this.graphW = padL + padR + months.length * slot;
    const y = (v: number) => padT + ih - (v / max) * ih;

    this.graphGridLines = [0, Math.round(max / 2), max].map(v => ({ y: y(v), label: v }));

    this.graphMonths = months.map((m, i) => ({
      label: m.label,
      x: padL + i * slot + slot * 0.18,
      y: y(m.count),
      w: slot * 0.64,
      h: ih + padT - y(m.count),
      count: m.count
    }));

    this.graphDots = sorted
      .filter(e => e.vodCount > 0)
      .map(e => {
        const d = new Date(e.startAt);
        const i = index.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`) ?? 0;
        const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        const frac = (d.getUTCDate() - 0.5) / daysInMonth;
        return { cx: padL + i * slot + slot * frac, cy: y(months[i].count) - 10, event: e };
      });
  }

  private showVideo(youtubeId: string, title: string, subtitle: string): void {
    this.video = { youtubeId, title, subtitle };
    this.videoSrc = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${youtubeId}?autoplay=1`);
  }

  /** Fetch the event's VODs and open the first (YouTube overlay, else a new tab). */
  openEventVideo(dot: GraphDot): void {
    const e = dot.event;
    const date = new Date(e.startAt);
    const subtitle = `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${e.signupCount} signed up`;
    this.qutieService.getEventVods(e.eventId).subscribe(vods => {
      if (!vods || vods.length === 0) return;
      const id = this.youtubeId(vods[0].url);
      if (id) {
        this.showVideo(id, e.title, subtitle);
      } else {
        window.open(vods[0].url, '_blank'); // non-YouTube VOD (Twitch etc.) opens in a new tab
      }
    });
  }

  dotTooltip(dot: GraphDot): string {
    const e = dot.event;
    const date = new Date(e.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${e.title}\n${date} · ${e.vodCount} video${e.vodCount === 1 ? '' : 's'} · click to watch`;
  }

  /** Accepts youtu.be/ID, watch?v=ID, /embed/ID or a raw id. */
  youtubeId(url: string | null): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{6,})/);
    if (match) return match[1];
    return /^[\w-]{6,}$/.test(url) ? url : null;
  }

  // ==================== Gallery + video overlays ====================

  openGalleryItem(item: GameGalleryItem): void {
    if (item.itemType === 'video' && item.youtubeId) {
      this.showVideo(item.youtubeId, item.caption ?? this.details?.gameName ?? '', '');
    } else if (item.imageUrl) {
      this.fullscreenImage = { src: item.imageUrl, alt: item.caption ?? '' };
    }
  }

  galleryThumb(item: GameGalleryItem): string | null {
    if (item.imageUrl) return item.imageUrl;
    if (item.itemType === 'video' && item.youtubeId) {
      return `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
    }
    return null;
  }

  closeVideo(): void { this.video = null; this.videoSrc = null; }
  closeImage(): void { this.fullscreenImage = null; }

  // ==================== Admin: game editor ====================

  openEditor(game: AdminGame | null, event?: Event): void {
    event?.stopPropagation();
    if (!this.isAdmin) return;

    this.editorGame = game
      ? { ...game }
      : {
          gameId: 0, gameName: '', imageUrl: null, bannerUrl: null, description: null,
          status: this.activeTab === 'prior' ? 'Previous' : 'Upcoming',
          siteUrl: null, period: null, players: null, fullStory: null,
          qutieGameId: null, pullFromQutie: false
        };
    this.editorOpen = true;
    this.statusMessage = '';
    this.errorMessage = '';
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.editorGame = null;
  }

  saveEditor(): void {
    const game = this.editorGame;
    if (!game) return;
    if (!game.gameName.trim()) {
      this.errorMessage = 'Game name is required.';
      return;
    }

    this.editorSaving = true;
    const finish = (ok: boolean, msg: string) => {
      this.editorSaving = false;
      if (ok) {
        this.statusMessage = msg;
        this.errorMessage = '';
        this.closeEditor();
        this.loadGames();
      } else {
        this.errorMessage = msg;
      }
    };

    if (game.gameId === 0) {
      this.gameService.createGame(game.gameName.trim()).subscribe({
        next: created => {
          const full = { ...game, gameId: created.gameId };
          this.gameService.updateGame(full).subscribe({
            next: () => finish(true, `Game "${game.gameName}" created. Open it again to upload its images.`),
            error: () => finish(false, 'Game created but saving its details failed - edit it again.')
          });
        },
        error: () => finish(false, 'Failed to create game.')
      });
    } else {
      this.gameService.updateGame(game).subscribe({
        next: () => finish(true, 'Game saved.'),
        error: () => finish(false, 'Failed to save game.')
      });
    }
  }

  deleteEditorGame(): void {
    const game = this.editorGame;
    if (!game || game.gameId === 0) return;
    if (!confirm(`⚠️ DELETE "${game.gameName}"?\n\nThis permanently removes the game, its achievements and gallery. Use the Previous status instead if you want to keep it.`)) {
      return;
    }

    this.gameService.deleteGame(game.gameId).subscribe({
      next: () => {
        this.statusMessage = `Game "${game.gameName}" deleted.`;
        this.closeEditor();
        this.loadGames();
      },
      error: () => this.errorMessage = 'Failed to delete game.'
    });
  }

  uploadImage(event: Event, type: 'card' | 'banner'): void {
    const game = this.editorGame;
    if (!game || game.gameId === 0) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.gameService.uploadGameImage(game.gameId, type, file).subscribe({
      next: result => {
        if (type === 'card') game.imageUrl = result.url;
        else game.bannerUrl = result.url;
        this.loadGames();
        input.value = '';
      },
      error: () => {
        this.errorMessage = 'Upload failed. Only jpg, png and webp up to 8 MB are allowed.';
        input.value = '';
      }
    });
  }

  // ==================== Admin: achievements ====================

  addAchievement(): void {
    if (!this.details) return;
    const { icon, title, description } = this.newAchievement;
    if (!title.trim()) {
      this.errorMessage = 'Achievement title is required.';
      return;
    }

    this.gameService.addAchievement(this.details.gameId, icon, title.trim(), description.trim() || null).subscribe({
      next: achievement => {
        this.details!.achievements.push(achievement);
        this.newAchievement = { icon: 'fa-medal', title: '', description: '' };
        this.errorMessage = '';
      },
      error: () => this.errorMessage = 'Failed to add achievement.'
    });
  }

  deleteAchievement(achievement: GameAchievement): void {
    if (!this.details) return;
    if (!confirm(`Remove achievement "${achievement.title}"?`)) return;

    this.gameService.deleteAchievement(this.details.gameId, achievement.achievementId).subscribe({
      next: () => {
        this.details!.achievements = this.details!.achievements.filter(a => a.achievementId !== achievement.achievementId);
      },
      error: () => this.errorMessage = 'Failed to remove achievement.'
    });
  }

  // ==================== Admin: gallery ====================

  onGalleryFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newGallery.file = input.files?.[0] ?? null;
  }

  addGalleryItem(): void {
    const details = this.details;
    if (!details) return;

    if (this.newGallery.itemType === 'video') {
      const id = this.youtubeId(this.newGallery.youtubeUrl);
      if (!id) {
        this.errorMessage = 'Enter a valid YouTube link.';
        return;
      }
      this.gameService.addGalleryItem(details.gameId, {
        itemType: 'video', youtubeId: id, caption: this.newGallery.caption.trim() || null
      }).subscribe({
        next: item => this.finishGalleryAdd(item),
        error: () => this.errorMessage = 'Failed to add the video.'
      });
    } else {
      if (!this.newGallery.file) {
        this.errorMessage = 'Pick an image to upload.';
        return;
      }
      this.galleryUploading = true;
      this.gameService.uploadGalleryImage(details.gameId, this.newGallery.file).subscribe({
        next: ({ url }) => {
          this.gameService.addGalleryItem(details.gameId, {
            itemType: 'image', imageUrl: url, caption: this.newGallery.caption.trim() || null
          }).subscribe({
            next: item => { this.galleryUploading = false; this.finishGalleryAdd(item); },
            error: () => { this.galleryUploading = false; this.errorMessage = 'Upload succeeded but saving the item failed.'; }
          });
        },
        error: () => {
          this.galleryUploading = false;
          this.errorMessage = 'Upload failed. Only jpg, png and webp up to 8 MB are allowed.';
        }
      });
    }
  }

  private finishGalleryAdd(item: GameGalleryItem): void {
    this.details!.gallery.push(item);
    this.newGallery = { itemType: 'image', youtubeUrl: '', caption: '', file: null };
    this.errorMessage = '';
  }

  deleteGalleryItem(item: GameGalleryItem): void {
    if (!this.details) return;
    if (!confirm('Remove this gallery item?')) return;

    this.gameService.deleteGalleryItem(this.details.gameId, item.itemId).subscribe({
      next: () => {
        this.details!.gallery = this.details!.gallery.filter(i => i.itemId !== item.itemId);
      },
      error: () => this.errorMessage = 'Failed to remove the gallery item.'
    });
  }

  // ==================== Admin: guild timeline ====================

  addTimelineEntry(): void {
    const { period, title, description } = this.newTimelineEntry;
    if (!period.trim() || !title.trim()) {
      this.errorMessage = 'Timeline entries need a period and a title.';
      return;
    }

    this.gameService.addTimelineEntry(period.trim(), title.trim(), description.trim() || null).subscribe({
      next: entry => {
        this.timeline.push(entry);
        this.newTimelineEntry = { period: '', title: '', description: '' };
        this.showTimelineForm = false;
        this.errorMessage = '';
      },
      error: () => this.errorMessage = 'Failed to add the timeline entry.'
    });
  }

  deleteTimelineEntry(entry: TimelineEntry): void {
    if (!confirm(`Remove timeline entry "${entry.title}"?`)) return;

    this.gameService.deleteTimelineEntry(entry.entryId).subscribe({
      next: () => this.timeline = this.timeline.filter(e => e.entryId !== entry.entryId),
      error: () => this.errorMessage = 'Failed to remove the timeline entry.'
    });
  }
}
