import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reactionconfig',
  templateUrl: './reactionconfig.component.html',
  styleUrl: './reactionconfig.component.css'
})
export class ReactionconfigComponent {
  reactionConfigs: any[] = [];
  roles: any[] = [];
  channels: any[] = [];
  newConfig = {
    Emoji: null,
    ModeratorRoleId: null,
    VerificationRoleId: null,
    OnlyOneChannelId: null,
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadConfigurations();
    this.loadDropdownData();
  }

  loadConfigurations() {
    this.http.get('/api/menu/ReactionRoleConfig/get', { withCredentials: true }).subscribe({
      next: (data: any) => (this.reactionConfigs = data),
      error: (err) => console.error('Error loading configurations', err),
    });
  }

  loadDropdownData() {
    this.http.get('/api/DropDown/roles', { withCredentials: true }).subscribe({
      next: (data: any) => (this.roles = data),
      error: (err) => console.error('Error loading roles', err),
    });

    this.http.get('/api/DropDown/channels', { withCredentials: true }).subscribe({
      next: (data: any) => (this.channels = data),
      error: (err) => console.error('Error loading channels', err),
    });
  }

  addConfig() {
    this.http.put('/api/menu/ReactionRoleConfig/update', this.newConfig, { withCredentials: true }).subscribe({
      next: () => {
        this.loadConfigurations(); // Refresh the table
        this.newConfig = { Emoji: null, ModeratorRoleId: null, VerificationRoleId: null, OnlyOneChannelId: null }; // Reset form
      },
      error: (err) => console.error('Error adding configuration', err),
    });
  }

  deleteConfig(id: number) {
    this.http.get(`/api/menu/ReactionRoleConfig/delete/${id}`, { withCredentials: true }).subscribe({
      next: () => this.loadConfigurations(), // Refresh the table
      error: (err) => console.error('Error deleting configuration', err),
    });
  }
}
