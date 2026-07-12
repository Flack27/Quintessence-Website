import { Component, OnInit } from '@angular/core';
import { GameService, PublicGame } from '../../services/game.service';
import { QutieService, QutieGameMember, QutieGuildMember } from '../../services/qutie.service';
import { QUTIE_MAIN_ROSTER_ROLE_ID } from '../../qutie.config';

/** A played-game token on a main-roster member (icon from the local games showcase). */
interface GameToken {
  name: string;
  imageUrl: string | null;
  initials: string;
}

/** One "active game" roster section, fed by the Qutie per-game members endpoint. */
interface GameRosterSection {
  game: PublicGame;
  members: QutieGameMember[];
  loaded: boolean;
}

@Component({
  selector: 'app-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css']
})
export class RosterComponent implements OnInit {
  loading = true;

  // Main roster: the Discord-role-scoped guild members from Qutie (no hand-managed list).
  mainMembers: QutieGuildMember[] = [];
  mainUnavailable = false;   // Qutie unreachable / no read key configured

  games: PublicGame[] = [];
  sections: GameRosterSection[] = [];

  private erroredAvatars = new Set<string>();
  private readonly tierOrder: Record<string, number> = { owner: 0, admin: 1, officer: 2, member: 3 };

  constructor(
    private gameService: GameService,
    private qutieService: QutieService
  ) { }

  ngOnInit(): void {
    this.gameService.getPublicGames().subscribe({
      next: games => {
        this.games = games;
        this.loadMainRoster();
        this.loadGameSections();
      },
      // Without the games list, tokens fall back to initials and there are no per-game sections,
      // but the main roster can still load.
      error: () => this.loadMainRoster()
    });
  }

  private loadMainRoster(): void {
    this.qutieService.getGuildMembers(QUTIE_MAIN_ROSTER_ROLE_ID).subscribe(members => {
      this.loading = false;
      if (members === null) { this.mainUnavailable = true; return; }
      this.mainMembers = [...members].sort((a, b) => {
        const tier = (this.tierOrder[a.rank.toLowerCase()] ?? 9) - (this.tierOrder[b.rank.toLowerCase()] ?? 9);
        return tier !== 0 ? tier : a.displayName.localeCompare(b.displayName);
      });
    });
  }

  private loadGameSections(): void {
    const linkedActive = this.games.filter(g => g.status === 'Active' && !!g.qutieGameId);
    this.sections = linkedActive.map(game => ({ game, members: [], loaded: false }));

    for (const section of this.sections) {
      this.qutieService.getGameMembers(section.game.qutieGameId!).subscribe(members => {
        section.loaded = true;
        if (members) {
          section.members = [...members].sort(
            (a, b) => (b.attendancePercent ?? -1) - (a.attendancePercent ?? -1));
        }
      });
    }
  }

  get visibleSections(): GameRosterSection[] {
    return this.sections.filter(s => s.members.length > 0);
  }

  // ---------- played-game tokens ----------

  /** Maps a member's Qutie game ids to the local games showcase (linked via PublicGame.qutieGameId). */
  tokens(member: QutieGuildMember): GameToken[] {
    return member.gameIds
      .map(qid => this.games.find(g => g.qutieGameId === qid))
      .filter((g): g is PublicGame => !!g)
      .map(g => ({ name: g.gameName, imageUrl: g.imageUrl, initials: this.initials(g.gameName) }));
  }

  /** Lower-cased permission tier ('owner'|'admin'|'officer'|'member') used for the role colour class. */
  rankTier(rank: string): string {
    return (rank || 'member').toLowerCase();
  }

  // ---------- avatars ----------

  avatarOk(url: string | null): boolean {
    return !!url && !this.erroredAvatars.has(url);
  }

  onAvatarError(url: string | null): void {
    if (url) this.erroredAvatars.add(url);
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  // ---------- attendance ring ----------

  readonly ringCircumference = 2 * Math.PI * 26;

  ringDash(percent: number | null): string {
    const filled = ((percent ?? 0) / 100) * this.ringCircumference;
    return `${filled} ${this.ringCircumference}`;
  }

  attendanceClass(percent: number | null): string {
    if (percent == null) return 'att-none';
    if (percent >= 80) return 'att-good';
    if (percent >= 60) return 'att-warn';
    return 'att-bad';
  }

  sinceLabel(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
}
