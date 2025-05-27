import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-submission',
  templateUrl: './submission.component.html',
  styleUrls: ['./submission.component.css']
})
export class SubmissionComponent implements OnInit, AfterViewInit {
  @ViewChild('descriptionTextarea', { static: false }) descriptionTextarea!: ElementRef<HTMLTextAreaElement>;

  submission: any = null;
  form: any = { title: '', description: '', questions: [] };
  loading: boolean = true;
  errorMessage: string = '';
  processingAction: boolean = false;
  userDescription: string = '';
  savingDescription: boolean = false;
  notesStatus: string = '';
  private descriptionUpdate = new Subject<string>();
  private shouldMaintainFocus = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Setup debounce for description updates
    this.descriptionUpdate.pipe(
      debounceTime(1000) // Wait for 1 second after the user stops typing
    ).subscribe(() => {
      this.saveDescription();
    });
  }

  ngOnInit(): void {
    const submissionId = this.route.snapshot.paramMap.get('submissionId');

    if (submissionId) {
      this.fetchForm(submissionId);
    } else {
      this.errorMessage = 'Invalid form or user ID.';
      this.loading = false;
    }
  }

  ngAfterViewInit(): void {
    // This will be called after the initial view initialization
    // We'll call initializeTextareaHeights after data is loaded
  }

  initializeTextareaHeights(): void {
    // Use a longer timeout to ensure DOM is fully updated
    setTimeout(() => {
      const textareas = document.querySelectorAll('.auto-expand-textarea');
      textareas.forEach((element) => {
        const textarea = element as HTMLTextAreaElement;
        if (textarea && textarea.value) {
          // Reset height to auto first
          textarea.style.height = 'auto';
          // Set height based on scroll height
          textarea.style.height = Math.max(textarea.scrollHeight, 38) + 'px';
        }
      });

      // Also initialize the admin notes textarea
      this.initializeAdminNotesHeight();
    }, 100); // Increased timeout
  }

  initializeAdminNotesHeight(): void {
    if (this.descriptionTextarea && this.descriptionTextarea.nativeElement) {
      const textarea = this.descriptionTextarea.nativeElement;
      textarea.style.height = 'auto';
      const minHeight = 150; // Match the CSS min-height
      textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
    }
  }

  // New method to handle admin notes textarea auto-expand on input
  onAdminNotesInput(): void {
    this.autoExpandAdminNotes();
    this.onDescriptionChange(); // Keep the existing save functionality
  }

  autoExpandAdminNotes(): void {
    if (this.descriptionTextarea && this.descriptionTextarea.nativeElement) {
      const textarea = this.descriptionTextarea.nativeElement;
      textarea.style.height = 'auto';
      const minHeight = 150; // Match the CSS min-height
      textarea.style.height = Math.max(textarea.scrollHeight, minHeight) + 'px';
    }
  }

  fetchForm(submissionId: string): void {
    this.http.get(`api/menu/FormSubmissions/get/${submissionId}`, { withCredentials: true }).subscribe({
      next: (submission: any) => {
        this.submission = submission;
        this.form.title = submission.title;
        this.form.description = submission.description;

        // Fetch user details to get the description
        this.fetchUserDetails(submission.userId);

        this.fetchQuestions(submission.formId, submissionId, submission.userId);
      },
      error: () => {
        this.errorMessage = 'Failed to load the form. Please try again later.';
        this.loading = false;
      }
    });
  }

  fetchUserDetails(userId: string): void {
    this.http.get(`api/user/user/${userId}`, { withCredentials: true }).subscribe({
      next: (userData: any) => {
        if (userData && userData.description) {
          this.userDescription = userData.description;
          // Initialize the height after setting the value
          setTimeout(() => {
            this.initializeAdminNotesHeight();
          }, 50);
        }
      },
      error: (error) => {
        console.error('Error fetching user details:', error);
      }
    });
  }

  fetchQuestions(formId: string, submissionId: string, userId: string): void {
    this.http.get(`api/userform/submission-questions/${formId}/${submissionId}/${userId}`, { withCredentials: true }).subscribe({
      next: (questions: any) => {
        this.form.questions = questions.map((q: any) => {
          if (q.answer && q.answer.length > 0) {
            if (this.isMultipleChoice(q)) {
              q.options = q.options.map((o: any) => ({
                ...o,
                selected: q.answer.some((a: any) => a.answer === o.answerOption),
              }));
            } else {
              q.answer = q.answer[0];
            }
          }
          return q;
        });
        this.fetchDependentQuestions(formId, submissionId, userId);
      },
      error: () => {
        this.errorMessage = 'Failed to load questions. Please try again later.';
        this.loading = false;
      }
    });
  }

  fetchDependentQuestions(formId: string, submissionId: string, userId: string): void {
    this.http.get(`api/userform/submission-dependent-questions/${formId}/${submissionId}/${userId}`, { withCredentials: true }).subscribe({
      next: (dependentQuestions: any) => {
        const addedQuestions = dependentQuestions.map((q: any) => {
          if (q.answer && q.answer.length > 0) {
            if (this.isMultipleChoice(q)) {
              q.options = q.options.map((o: any) => ({
                ...o,
                selected: q.answer.some((a: any) => a.answer === o.answerOption),
              }));
            } else {
              q.answer = q.answer[0];
            }
          }
          return q;
        });
        this.form.questions = [...this.form.questions, ...addedQuestions];
        this.loading = false;

        // Force change detection and then initialize textarea heights
        this.cdr.detectChanges();
        this.initializeTextareaHeights();
      },
      error: () => {
        this.errorMessage = 'Failed to load dependent questions. Please try again later.';
        this.loading = false;
      }
    });
  }

  onDescriptionChange(): void {
    this.notesStatus = 'Saving...';
    this.shouldMaintainFocus = true; // Flag to maintain focus
    this.descriptionUpdate.next(this.userDescription);
  }

  onDescriptionFocus(): void {
    this.shouldMaintainFocus = true;
  }

  onDescriptionBlur(): void {
    this.shouldMaintainFocus = false;
  }

  saveDescription(): void {
    if (!this.submission || this.savingDescription) {
      return;
    }

    this.savingDescription = true;

    // Store cursor position and focus state
    const activeElement = document.activeElement;
    const isDescriptionFocused = this.descriptionTextarea?.nativeElement === activeElement;
    let cursorPosition = 0;

    if (isDescriptionFocused) {
      cursorPosition = this.descriptionTextarea.nativeElement.selectionStart || 0;
    }

    const userData = {
      userId: this.submission.userId,
      description: this.userDescription
    };

    this.http.put('api/user/save-description', userData, { withCredentials: true }).subscribe({
      next: () => {
        this.notesStatus = 'Saved';
        setTimeout(() => {
          this.notesStatus = '';
        }, 3000);
        this.savingDescription = false;

        // Restore focus and cursor position if needed
        if (this.shouldMaintainFocus && this.descriptionTextarea) {
          // Use setTimeout to ensure DOM updates are complete
          setTimeout(() => {
            this.descriptionTextarea.nativeElement.focus();
            this.descriptionTextarea.nativeElement.setSelectionRange(cursorPosition, cursorPosition);
          }, 0);
        }
      },
      error: (error) => {
        this.notesStatus = 'Failed to save';
        console.error('Error saving user description:', error);
        this.savingDescription = false;

        // Still try to restore focus on error
        if (this.shouldMaintainFocus && this.descriptionTextarea) {
          setTimeout(() => {
            this.descriptionTextarea.nativeElement.focus();
            this.descriptionTextarea.nativeElement.setSelectionRange(cursorPosition, cursorPosition);
          }, 0);
        }
      }
    });
  }

  isTextType(question: any): boolean {
    return Number(question.typeId) === 1;
  }

  isMultipleChoice(question: any): boolean {
    return Number(question.typeId) === 2;
  }

  isDropdown(question: any): boolean {
    return Number(question.typeId) === 3;
  }

  isSingleChoice(question: any): boolean {
    return Number(question.typeId) === 4;
  }

  approveSubmission(): void {
    this.updateSubmissionStatus(true);
  }

  rejectSubmission(): void {
    this.updateSubmissionStatus(false);
  }

  private updateSubmissionStatus(approved: boolean): void {
    if (!this.submission || this.processingAction) {
      return;
    }

    this.processingAction = true;

    const payload = {
      submissionId: this.submission.submissionId,
      approved: approved
    };

    this.http.post('api/menu/FormSubmissions/approval', payload, { withCredentials: true }).subscribe({
      next: (response: any) => {
        this.router.navigate(['/menu/submissions']);
      },
      error: (error) => {
        this.errorMessage = `Failed to ${approved ? 'approve' : 'reject'} the submission. Please try again.`;
        console.error('Error updating submission status:', error);
        this.processingAction = false;
      },
      complete: () => {
        this.processingAction = false;
      }
    });
  }
}
