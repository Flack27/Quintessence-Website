import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit {
  messages: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';
  searchQuery: string = '';
  filteredMessages: any[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 10;
  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchMessages();
  }

  fetchMessages(): void {
    this.http.get<any[]>('/api/menu/userdata/messages', { withCredentials: true }).subscribe({
      next: (data) => {
        this.messages = data.map((message, index) => ({
          ...message,
          rank: index + 1 
        }));
        this.filteredMessages = [...this.messages]; 
        this.loading = false; 
      },
      error: (err) => {
        this.errorMessage = 'Failed to fetch messages. Please try again later.';
        console.error(err); 
        this.loading = false; 
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterMessages();
  }

  filterMessages(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredMessages = this.messages.filter(message =>
      message.displayname.toLowerCase().includes(query)
    );
    this.currentPage = 1;
  }


  // Calculate paginated data
  get paginatedVoice(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredMessages.slice(startIndex, startIndex + this.itemsPerPage);
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
    return Math.ceil(this.filteredMessages.length / this.itemsPerPage);
  }
}
