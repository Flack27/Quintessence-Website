import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent implements OnInit {
  channels: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.fetchChannels();
  }

  fetchChannels(): void {
    this.http.get('api/menu/events/category', { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.channels = data;
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 401) {
          this.errorMessage = 'Unauthorized access. Please log in again.';
        } else {
          this.errorMessage = 'Failed to load channels. Please try again later.';
        }
        this.loading = false;
      }
    });
  }

  selectChannel(channelId: number): void {
    this.router.navigate([channelId], { relativeTo: this.route });
  }
}
