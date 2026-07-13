import { Component, OnInit } from '@angular/core';
import { QutieService, QutieGame, QutieGuildMember } from '../../services/qutie.service';
import { QUTIE_MAIN_ROSTER_ROLE_ID, QUTIE_ROSTER_RANK_ROLE_IDS } from '../../qutie.config';

/** A played-game token on a roster member, rendered from the Qutie game's emoji. */
interface GameToken {
  name: string;
  imageUrl: string | null;   // custom Discord emoji -> CDN image
  emojiChar: string | null;  // unicode emoji -> rendered as text
  color: string | null;      // the game's colour (fallback badge tint)
  initials: string;          // last-resort fallback
}

@Component({
  selector: 'app-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css']
})
export class RosterComponent implements OnInit {
  loading = true;
  unavailable = false;   // Qutie unreachable / no read key configured

  members: QutieGuildMember[] = [];
  private gamesById = new Map<string, QutieGame>();

  private erroredAvatars = new Set<string>();
  private readonly rankOrder = new Map<string, number>(
    QUTIE_ROSTER_RANK_ROLE_IDS.map((id, i) => [id, i] as [string, number]));
  // Colours by rank priority (highest first), matching the config order.
  private readonly rankColors = ['#f5b942', '#eb2f8a', '#63c1ff', '#b3a3d1'];

  constructor(private qutieService: QutieService) { }

  ngOnInit(): void {
    // Games first (they carry the emoji + colour the tokens use), then the roster.
    this.qutieService.getGames().subscribe(games => {
      if (games) for (const g of games) this.gamesById.set(g.gameId, g);
      this.loadRoster();
    });
  }

  private loadRoster(): void {
    this.qutieService.getGuildMembers(QUTIE_MAIN_ROSTER_ROLE_ID, QUTIE_ROSTER_RANK_ROLE_IDS).subscribe(members => {
      this.loading = false;
      if (members === null) { this.unavailable = true; return; }
      this.members = [...members].sort((a, b) => {
        const ra = this.rankIndex(a), rb = this.rankIndex(b);
        return ra !== rb ? ra - rb : a.displayName.localeCompare(b.displayName);
      });
    });
  }

  // ---------- rank role ----------

  private rankIndex(m: QutieGuildMember): number {
    const id = m.rankRole?.roleId;
    return id != null && this.rankOrder.has(id) ? this.rankOrder.get(id)! : 99;
  }

  roleName(m: QutieGuildMember): string {
    return m.rankRole?.name ?? 'Member';
  }

  roleColor(m: QutieGuildMember): string {
    const i = this.rankIndex(m);
    return this.rankColors[i] ?? this.rankColors[this.rankColors.length - 1];
  }

  // ---------- game tokens ----------

  /** First 4 games the member plays (guild game order), rendered from each Qutie game's emoji. */
  tokens(m: QutieGuildMember): GameToken[] {
    return m.gameIds
      .map(id => this.gamesById.get(id))
      .filter((g): g is QutieGame => !!g)
      .slice(0, 4)
      .map(g => this.tokenFor(g));
  }

  private tokenFor(g: QutieGame): GameToken {
    const emoji = g.emoji ?? '';
    const custom = emoji.match(/^<(a)?:\w+:(\d+)>$/);   // custom Discord emoji <:name:id> / <a:name:id>
    return {
      name: g.gameName,
      imageUrl: custom ? `https://cdn.discordapp.com/emojis/${custom[2]}.${custom[1] ? 'gif' : 'png'}` : null,
      emojiChar: !custom && emoji ? emoji : null,
      color: g.color,
      initials: this.initials(g.gameName)
    };
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
}
