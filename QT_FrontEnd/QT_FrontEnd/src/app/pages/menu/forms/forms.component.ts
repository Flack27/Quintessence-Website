import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-formlist',
  templateUrl: './forms.component.html',
  styleUrls: ['./forms.component.css']
})
export class FormsComponent implements OnInit {
  forms: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';
  showFormPopup: boolean = false;
  newForm = { Title: '', Description: '' };
  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.fetchForms();
  }

  fetchForms(): void {
    this.http.get('api/menu/form', { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.forms = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load forms. Please try again later.';
        this.loading = false;
      }
    });
  }

  handleToggle(form: any): void {
    if (!form.isActive) {
      this.toggleActive(form);
    }
  }

  toggleActive(form: any): void {
    this.http.get(`api/menu/form/${form.formId}/set-active`, { withCredentials: true }).subscribe({
      next: () => {
        this.forms.forEach(f => f.isActive = f.formId === form.formId);
      },
      error: () => {
        this.errorMessage = 'Failed to update form status. Please try again.';
      }
    });
  }

  deleteForm(formId: number): void {
    if (confirm('Are you sure you want to delete this form?')) {
      this.http.get(`api/menu/form/${formId}/delete`, { withCredentials: true }).subscribe({
        next: () => {
          this.forms = this.forms.filter(form => form.formId !== formId);
          this.errorMessage = '';
        },
        error: (err) => {
          console.error('Failed to delete form:', err);
          this.errorMessage = 'Failed to delete form. Please try again.';
        }
      });
    }
  }

  addForm(): void {
    const newForm = { Title: 'New Form', Description: '' };
    this.http.put('api/menu/form/add-form', newForm, { withCredentials: true }).subscribe({
      next: (form: any) => {
        this.router.navigate([form.formId], { relativeTo: this.route });
      },
      error: () => {
        this.errorMessage = 'Failed to add form. Please try again.';
      }
    });

  }
  selectForm(formId: number): void {
    this.router.navigate([formId], { relativeTo: this.route });
  }
}
