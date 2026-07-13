import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { QutieService, QutieGame, QutieGuildMember } from '../../services/qutie.service';
import { QUTIE_MAIN_ROSTER_ROLE_ID, QUTIE_ROSTER_RANK_ROLE_IDS } from '../../qutie.config';

/** A played-game tag on a roster member, rendered from the Qutie game's emoji + colour. */
interface GameToken {
  name: string;
  imageUrl: string | null;   // custom Discord emoji -> CDN png
  emojiChar: string | null;  // unicode emoji -> rendered as text
  color: string | null;      // the game's colour (tag border)
}

@Component({
  selector: 'app-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css'],
  // Like the games page: the page background is a body{} rule, which only reaches the
  // real <body> without style encapsulation.
  encapsulation: ViewEncapsulation.None
})
export class RosterComponent implements OnInit {
  loading = true;
  unavailable = false;   // Qutie unreachable / no read key configured

  members: QutieGuildMember[] = [];
  private gamesById = new Map<string, QutieGame>();

  private erroredAvatars = new Set<string>();
  private readonly rankOrder = new Map<string, number>(
    QUTIE_ROSTER_RANK_ROLE_IDS.map((id, i) => [id, i] as [string, number]));
  // Discord role gradient colours (2 stops each), by rank priority, matching the config order.
  // The API can't return a role's colour, so these are hardcoded per role.
  private readonly rankGradients = [
    ['#ff0090', '#86035a'],
    ['#60009c', '#d400b1'],
    ['#ac76b4', '#8b0dad'],
    ['#3765b4', '#b14bd6']
  ];

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

  /** The member's rank-role gradient (null when no rank role matched, e.g. before Qutie is deployed). */
  roleGradient(m: QutieGuildMember): string | null {
    const g = this.rankGradients[this.rankIndex(m)];
    return g ? `linear-gradient(90deg, ${g[0]}, ${g[1]})` : null;
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
    const custom = /^<a?:\w+:(\d+)>$/.exec(emoji);   // custom Discord emoji <:name:id> / <a:name:id>
    return {
      name: g.gameName,
      imageUrl: custom ? `https://cdn.discordapp.com/emojis/${custom[1]}.png` : null,
      emojiChar: !custom && emoji ? emoji : null,
      color: g.color
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
