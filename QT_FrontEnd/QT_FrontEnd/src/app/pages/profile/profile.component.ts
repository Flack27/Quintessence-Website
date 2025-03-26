import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface Role {
  roleId: number;
  roleName: string;
}


interface User {
  userId: number;
  userName: string;
  displayName: string;
  avatar: string;
  roles: Role[];
  steam: string;
  x: string;
  twitch: string;
  youtube: string;
  description: string;
}


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})


export class ProfileComponent implements OnInit {
  userAuth: any = null;
  user: User | null = null;
  userLinks = {
    userId: 0,
    steam: '',
    x: '',
    twitch: '',
    youtube: ''
  };
  loading = true;
  errorMessage = '';
  savingLinks = false;
  saveSuccess = false;


  rolePriority: string[] = ['Monarchs', 'Advisors', 'Auxiliary', 'Guild Bot', 'Main Roster'];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.user$.subscribe((userAuth) => {
      this.userAuth = userAuth;
      if (userAuth) {
        this.loadUserProfile(userAuth.claims.id);
      } else {
        this.errorMessage = 'User ID not found.';
        this.loading = false;
      }
    });
  }


  loadUserProfile(userId: number): void {
    this.loading = true;
    this.http.get<User>(`api/user/user/${userId}`).subscribe({
      next: (data) => {
        this.user = data;
        this.userLinks = {
          userId: data.userId,
          steam: data.steam || '',
          x: data.x || '',
          twitch: data.twitch || '',
          youtube: data.youtube || ''
        };
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.errorMessage = 'Failed to load profile. Please try again later.';
        this.loading = false;
      }
    });
  }

  saveLinks(): void {
    if (this.savingLinks) return;

    this.savingLinks = true;

    this.http.put('api/user/save-links', this.userLinks).subscribe({
      next: () => {
        // Update the user object with new links
        if (this.user) {
          this.user.steam = this.userLinks.steam;
          this.user.x = this.userLinks.x;
          this.user.twitch = this.userLinks.twitch;
          this.user.youtube = this.userLinks.youtube;
        }

        this.savingLinks = false;
        this.saveSuccess = true;

        // Hide success message after 3 seconds
        setTimeout(() => {
          this.saveSuccess = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error saving links:', error);
        this.errorMessage = 'Failed to save links. Please try again.';
        this.savingLinks = false;
      }
    });
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
}
