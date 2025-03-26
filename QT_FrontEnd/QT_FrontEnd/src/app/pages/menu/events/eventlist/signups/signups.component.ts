import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-signups',
  templateUrl: './signups.component.html',
  styleUrls: ['./signups.component.css']
})
export class SignupsComponent implements OnInit {
  eventTitle: string | null = null;
  eventDate: string | null = null;
  signups: any[] = [];
  filteredSignups: any[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  errorMessage: string = '';

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.eventTitle = params['title'];
      this.eventDate = params['date'];
    });

    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (eventId) {
      this.fetchSignups(eventId);
    }
  }

  fetchSignups(eventId: string): void {
    this.http.get(`api/menu/events/${eventId}/signups`, { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.signups = data;
        this.filteredSignups = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.status === 404 ? 'Signups not found.' : 'Failed to load signups. Please try again later.';
        this.loading = false;
      }
    });
  }

  // Clear search functionality
  clearSearch() {
    this.searchQuery = '';
    this.filterSignups();
  }

  filterSignups(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredSignups = this.signups.filter(signup =>
      signup.displayName.toLowerCase().includes(query)
    );
  }
}
