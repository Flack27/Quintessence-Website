import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-voice',
  templateUrl: './voice.component.html',
  styleUrl: './voice.component.css'
})
export class VoiceComponent implements OnInit {
  voice: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';
  searchQuery: string = '';
  filteredVoice: any[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 10;
  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchVoice();
  }

  fetchVoice(): void {
    this.http.get<any[]>('/api/menu/userdata/voice-data', { withCredentials: true }).subscribe({
      next: (data) => {
        this.voice = data.map((voice, index) => ({
          ...voice,
          rank: index + 1
        }));
        this.filteredVoice = [...this.voice];
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to fetch voice data. Please try again later.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterVoice();
  }

  filterVoice(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredVoice = this.voice.filter(voice =>
      voice.displayname.toLowerCase().includes(query)
    );
    this.currentPage = 1;
  }

  // Calculate paginated data
  get paginatedVoice(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredVoice.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Go to the next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Go to the previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Calculate total pages
  get totalPages(): number {
    return Math.ceil(this.filteredVoice.length / this.itemsPerPage);
  }
}
