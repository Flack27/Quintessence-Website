import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-eventsconfig',
  templateUrl: './eventsconfig.component.html',
  styleUrl: './eventsconfig.component.css'
})
export class EventsconfigComponent {
  eventConfigs: any[] = [];
  roles: any[] = [];
  channels: any[] = [];
  games: any[] = [];
  newConfig = {
    ChannelId: null,
    RoleId: null,
    GameId: null,
    SheetId: null,
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadConfigurations();
    this.loadDropdownData();
  }

  loadConfigurations() {
    this.http.get('/api/menu/EventChannels/get', { withCredentials: true }).subscribe({
      next: (data: any) => (this.eventConfigs = data),
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

    this.http.get('/api/DropDown/games', { withCredentials: true }).subscribe({
      next: (data: any) => (this.games = data),
      error: (err) => console.error('Error loading games', err),
    });
  }

  addConfig() {
    this.http.put('/api/menu/EventChannels/update', this.newConfig, { withCredentials: true }).subscribe({
      next: () => {
        this.loadConfigurations(); // Refresh the table
        this.newConfig = { ChannelId: null, RoleId: null, GameId: null, SheetId: null }; // Reset form
      },
      error: (err) => console.error('Error adding configuration', err),
    });
  }

  deleteConfig(id: number) {
    this.http.get(`/api/menu/EventChannels/delete/${id}`, { withCredentials: true }).subscribe({
      next: () => this.loadConfigurations(), // Refresh the table
      error: (err) => console.error('Error deleting configuration', err),
    });
  }


}
