import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-eventlist',
  templateUrl: './eventlist.component.html',
  styleUrls: ['./eventlist.component.css']
})
export class EventlistComponent implements OnInit {
  channelId: string | null = null;
  events: any[] = [];
  filteredEvents: any[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  errorMessage: string = '';
  categoryName: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.channelId = params.get('id');
      if (this.channelId) {
        this.fetchEvents(this.channelId);
      }
    });
  }

  fetchEvents(channelId: string): void {
    this.http.get(`api/menu/events/${(channelId)}`, { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.events = data;
        this.filteredEvents = data;
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 401) {
          this.errorMessage = 'Unauthorized access. Please log in again.';
        } else {
          this.errorMessage = 'Failed to load events. Please try again later.';
        }
        this.loading = false;
      }
    });
  }

  filterEvents(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredEvents = this.events.filter(event =>
      event.eventTitle.toLowerCase().includes(query) ||
      event.formattedDate.toLowerCase().includes(query)
    );
  }

  selectEvent(event: any): void {
    const eventId = event.eventId;
    this.router.navigate([eventId], {
      relativeTo: this.route, queryParams: {
        title: event.eventTitle,
        date: event.formattedDate
      }
    });
  }

  // Clear search functionality
  clearSearch() {
    this.searchQuery = '';
    this.filterEvents();
  }
}
