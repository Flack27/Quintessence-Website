import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-submissions',
  templateUrl: './submissions.component.html',
  styleUrls: ['./submissions.component.css']
})
export class SubmissionsComponent implements OnInit {
  submissions: any[] = [];
  filteredSubmissions: any[] = [];
  searchQuery: string = '';
  loading: boolean = true;
  errorMessage: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.fetchSubmissions();
  }

  fetchSubmissions(): void {
    this.http.get('api/menu/FormSubmissions/get', { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.submissions = data;
        this.filteredSubmissions = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load submissions. Please try again later.';
        this.loading = false;
      }
    });
  }

  filterSubmissions(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredSubmissions = this.submissions.filter(submission =>
      submission.userName?.toLowerCase().includes(query) ||
      new Date(submission.submitDate).toLocaleDateString().toLowerCase().includes(query)
    );
  }

  selectSubmission(submissionId: number): void {
    this.router.navigate([submissionId], { relativeTo: this.route });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterSubmissions();
  }

  // Calculate paginated data
  get paginatedSubmissions(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSubmissions.slice(startIndex, startIndex + this.itemsPerPage);
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
    return Math.ceil(this.filteredSubmissions.length / this.itemsPerPage);
  }
}
