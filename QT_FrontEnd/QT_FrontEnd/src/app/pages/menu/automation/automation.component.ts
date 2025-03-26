import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-automation',
  templateUrl: './automation.component.html',
  styleUrl: './automation.component.css'
})
export class AutomationComponent implements OnInit {
  automationConfigs: any[] = [];
  newConfig = {
    CheckDelayMinutes: null,
    AutoRemoveAbsentUsers: false,
    AutoRemoveLateUsers: false,
    PingUsers: false
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadConfigurations();
  }

  loadConfigurations() {
    this.http.get('/api/menu/Automation/get', { withCredentials: true }).subscribe({
      next: (data: any) => (this.automationConfigs = data),
      error: (err) => console.error('Error loading automation configurations', err)
    });
  }

  addConfig() {
    this.http.put('/api/menu/Automation/update', this.newConfig, { withCredentials: true }).subscribe({
      next: () => {
        this.loadConfigurations(); // Refresh the table
        // Reset form with default values
        this.newConfig = {
          CheckDelayMinutes: null,
          AutoRemoveAbsentUsers: false,
          AutoRemoveLateUsers: false,
          PingUsers: false
        };
      },
      error: (err) => console.error('Error adding automation configuration', err)
    });
  }

  deleteConfig(id: number) {
    this.http.get(`/api/menu/Automation/delete/${id}`, { withCredentials: true }).subscribe({
      next: () => this.loadConfigurations(), // Refresh the table
      error: (err) => console.error('Error deleting automation configuration', err)
    });
  }
}
