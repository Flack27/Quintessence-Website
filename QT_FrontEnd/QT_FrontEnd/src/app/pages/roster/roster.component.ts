import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { GameService, PublicGame } from '../../services/game.service';
import { RosterService, RosterMember, RankTier, MemberPayload } from '../../services/roster.service';
import { QutieService, QutieGameMember } from '../../services/qutie.service';

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

interface EditableMember {
  memberId: number;   // 0 = new
  displayName: string;
  rank: string;
  rankTier: RankTier;
  avatarUrl: string;
  gameIds: number[];
}

@Component({
  selector: 'app-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css']
})
export class RosterComponent implements OnInit {
  loading = true;
  isAdmin = false;

  members: RosterMember[] = [];
  games: PublicGame[] = [];
  sections: GameRosterSection[] = [];

  private erroredAvatars = new Set<string>();
  private readonly tierOrder: Record<string, number> = { owner: 0, admin: 1, officer: 2, member: 3 };

  // Admin editor
  readonly rankTiers: { tier: RankTier; label: string }[] = [
    { tier: 'owner', label: 'Owner' },
    { tier: 'admin', label: 'Admin' },
    { tier: 'officer', label: 'Officer' },
    { tier: 'member', label: 'Member' }
  ];
  editorOpen = false;
  editor: EditableMember | null = null;
  editorSaving = false;
  statusMessage = '';
  errorMessage = '';

  constructor(
    private rosterService: RosterService,
    private gameService: GameService,
    private qutieService: QutieService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.isAdmin$.subscribe(isAdmin => this.isAdmin = isAdmin === true);

    this.gameService.getPublicGames().subscribe({
      next: games => {
        this.games = games;
        this.loadGameSections();
      },
      error: () => { /* tokens fall back to initials; no per-game sections */ }
    });

    this.rosterService.getRoster().subscribe({
      next: members => {
        this.members = [...members].sort((a, b) => {
          const tier = (this.tierOrder[a.rankTier] ?? 9) - (this.tierOrder[b.rankTier] ?? 9);
          return tier !== 0 ? tier : a.displayName.localeCompare(b.displayName);
        });
        this.loading = false;
      },
      error: () => { this.loading = false; }
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

  tokens(member: RosterMember): GameToken[] {
    return member.gameIds
      .map(id => this.games.find(g => g.gameId === id))
      .filter((g): g is PublicGame => !!g)
      .map(g => ({ name: g.gameName, imageUrl: g.imageUrl, initials: this.initials(g.gameName) }));
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

  // ==================== Admin: main roster editing ====================

  openEditor(member: RosterMember | null): void {
    if (!this.isAdmin) return;
    this.editor = member
      ? { memberId: member.memberId, displayName: member.displayName, rank: member.rank,
          rankTier: member.rankTier, avatarUrl: member.avatarUrl ?? '', gameIds: [...member.gameIds] }
      : { memberId: 0, displayName: '', rank: 'Member', rankTier: 'member', avatarUrl: '', gameIds: [] };
    this.editorOpen = true;
    this.errorMessage = '';
    this.statusMessage = '';
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.editor = null;
  }

  toggleEditorGame(gameId: number): void {
    if (!this.editor) return;
    const i = this.editor.gameIds.indexOf(gameId);
    if (i >= 0) this.editor.gameIds.splice(i, 1);
    else this.editor.gameIds.push(gameId);
  }

  editorHasGame(gameId: number): boolean {
    return !!this.editor && this.editor.gameIds.includes(gameId);
  }

  /** Auto-fills the rank label when the tier changes and the label is still a default. */
  onTierChange(): void {
    if (!this.editor) return;
    const defaults = this.rankTiers.map(t => t.label);
    if (!this.editor.rank.trim() || defaults.includes(this.editor.rank)) {
      this.editor.rank = this.rankTiers.find(t => t.tier === this.editor!.rankTier)?.label ?? 'Member';
    }
  }

  saveEditor(): void {
    const e = this.editor;
    if (!e) return;
    if (!e.displayName.trim()) {
      this.errorMessage = 'Name is required.';
      return;
    }

    const payload: MemberPayload = {
      displayName: e.displayName.trim(),
      rank: e.rank.trim() || 'Member',
      rankTier: e.rankTier,
      avatarUrl: e.avatarUrl.trim() || null,
      gameIds: e.gameIds
    };

    this.editorSaving = true;
    const done = (ok: boolean, msg: string) => {
      this.editorSaving = false;
      if (ok) { this.statusMessage = msg; this.closeEditor(); this.reload(); }
      else { this.errorMessage = msg; }
    };

    if (e.memberId === 0) {
      this.rosterService.addMember(payload).subscribe({
        next: () => done(true, 'Member added.'),
        error: () => done(false, 'Failed to add member.')
      });
    } else {
      this.rosterService.updateMember(e.memberId, payload).subscribe({
        next: () => done(true, 'Member saved.'),
        error: () => done(false, 'Failed to save member.')
      });
    }
  }

  deleteEditorMember(): void {
    const e = this.editor;
    if (!e || e.memberId === 0) return;
    if (!confirm(`Remove ${e.displayName} from the roster?`)) return;

    this.rosterService.deleteMember(e.memberId).subscribe({
      next: () => { this.statusMessage = `${e.displayName} removed.`; this.closeEditor(); this.reload(); },
      error: () => this.errorMessage = 'Failed to remove member.'
    });
  }

  private reload(): void {
    this.rosterService.getRoster().subscribe({
      next: members => this.members = [...members].sort((a, b) => {
        const tier = (this.tierOrder[a.rankTier] ?? 9) - (this.tierOrder[b.rankTier] ?? 9);
        return tier !== 0 ? tier : a.displayName.localeCompare(b.displayName);
      })
    });
  }
}
