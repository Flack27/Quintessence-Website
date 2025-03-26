import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Role {
  roleId: number;
  roleName: string;
}

interface RosterUser {
  userId: number;
  userName?: string;
  displayName: string;
  avatar: string;
  roles: Role[];
  steam?: string;
  x?: string;
  twitch?: string;
  youtube?: string;
  description?: string;
  inGuild?: boolean;
}

@Component({
  selector: 'app-roster',
  templateUrl: './roster.component.html',
  styleUrl: './roster.component.css'
})
export class RosterComponent implements OnInit {
  users: RosterUser[] = [];
  loading: boolean = true;
  errorMessage: string = '';

  // Role priority list (from highest to lowest)
  rolePriority: string[] = ['Monarchs', 'Advisors', 'Auxiliary', 'Guild Bot', 'Main Roster'];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchUsers();
  }


  fetchUsers(): void {
    this.http.get<RosterUser[]>('api/user/users', { withCredentials: true }).subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading roster users:', err);
        this.errorMessage = 'Failed to load roster. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Gets the highest priority role for a user
   */
  getHighestPriorityRole(roles: Role[]): string {
    if (!roles || !roles.length) return '';

    // Find the role with the lowest index in rolePriority (highest priority)
    let highestRole = '';
    let highestPriority = Number.MAX_VALUE;

    for (const role of roles) {
      const priority = this.rolePriority.indexOf(role.roleName);
      if (priority !== -1 && priority < highestPriority) {
        highestPriority = priority;
        highestRole = role.roleName;
      }
    }

    return highestRole;
  }

  getRoleColorClass(roles: Role[]): string {
    const highestRole = this.getHighestPriorityRole(roles);
    switch (highestRole) {
      case 'Monarchs': return 'Monarchs';
      case 'Advisors': return 'Advisors';
      case 'Auxiliary': return 'Auxiliary';
      case 'Guild Bot': return 'Guild-Bot';
      case 'Main Roster': return 'Main-Roster';
      default: return '';
    }
  }

  ensureHttpPrefix(url: string): void {
    if (!url) return;

    // Ensure the URL has a proper prefix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Open in a new tab
    window.open(url, '_blank');
  }
}
