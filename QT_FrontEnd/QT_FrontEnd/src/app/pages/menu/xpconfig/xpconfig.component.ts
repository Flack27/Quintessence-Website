import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-xpconfig',
  templateUrl: './xpconfig.component.html',
  styleUrl: './xpconfig.component.css'
})
export class XpconfigComponent {
  xpConfig: any = {
    messageMinXP: 0,
    messageMaxXP: 0,
    messageCooldown: 0,
    voiceMinXP: 0,
    voiceMaxXP: 0,
    voiceCooldown: 0
  };
  roles: any[] = [];
  voiceConfigs: any[] = [];
  messageConfigs: any[] = [];
  newVoiceConfig = { level: '', roleId: '' };
  newMessageConfig = { level: '', roleId: '' };
  loading: boolean = true;
  errorMessage: string = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchXPConfig();
    this.loadRoles();
    this.loadVoiceConfigs();
    this.loadMessageConfigs();
  }

  loadRoles() {
    this.http.get('api/dropdown/roles', { withCredentials: true }).subscribe({
      next: (roles: any) => (this.roles = roles),
      error: () => (this.errorMessage = 'Failed to load roles')
    });
  }

  loadMessageConfigs() {
    this.http.get('api/menu/LevelMessageConfig/get', { withCredentials: true }).subscribe({
      next: (configs: any) => (this.messageConfigs = configs),
      error: () => (this.errorMessage = 'Failed to load message configs')
    });
  }

  loadVoiceConfigs() {
    this.http.get('api/menu/LevelVoiceConfig/get', { withCredentials: true }).subscribe({
      next: (configs: any) => (this.voiceConfigs = configs),
      error: () => (this.errorMessage = 'Failed to load voice configs')
    });
  }

  deleteVoiceConfig(id: number) {
    this.http.get(`api/menu/LevelVoiceConfig/delete/${id}`, { withCredentials: true }).subscribe(() => this.loadVoiceConfigs());
  }

  deleteMessageConfig(id: number) {
    this.http.get(`api/menu/LevelMessageConfig/delete/${id}`, { withCredentials: true }).subscribe(() => this.loadMessageConfigs());
  }

  addVoiceConfig() {
    this.http.put('api/menu/LevelVoiceConfig/update', this.newVoiceConfig, { withCredentials: true }).subscribe(() => {
      this.loadVoiceConfigs();
      this.newVoiceConfig = { level: '', roleId: '' };
    });
  }

  addMessageConfig() {
    this.http.put('api/menu/LevelMessageConfig/update', this.newMessageConfig, { withCredentials: true }).subscribe(() => {
      this.loadMessageConfigs();
      this.newMessageConfig = { level: '', roleId: '' };
    });
  }

  fetchXPConfig(): void {
    this.http.get('/api/menu/xpconfig/get', { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.xpConfig = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load XP configuration. Please try again later.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  saveConfig(): void {
    this.http.put('/api/menu/xpconfig/update', this.xpConfig, { withCredentials: true }).subscribe({
      next: () => {
        alert('Configuration saved successfully!');
      },
      error: (err) => {
        this.errorMessage = 'Failed to save configuration. Please try again.';
        console.error(err);
      }
    });
  }
}
