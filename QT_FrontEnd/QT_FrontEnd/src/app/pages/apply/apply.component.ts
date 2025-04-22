import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NgForm } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-apply',
  templateUrl: './apply.component.html',
  styleUrls: ['./apply.component.css']
})
export class ApplyComponent implements OnInit {
  form: any = { title: '', description: '', questions: [] };
  loading: boolean = true;
  showPopup = false;
  showGuildPopup = false;
  errorMessage: string = '';
  user: any = null;
  firstForm: boolean = true;
  submissionId: any = null;
  isSubmitting = false;

  constructor(private authService: AuthService, private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    this.authService.refreshUserInfo();

    this.authService.user$.subscribe((user) => {
      if (!user.isAuthenticated) {
        return;
      }

      this.user = user;

      if (!user.inGuild) {
        this.showGuildPopup = true;
      } else if (user.filledForm) {
        this.showPopup = true;
      }
    });

    this.fetchForm();
  }


  autoExpand(event: any): void {
    const textarea = event.target;

    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const textareas = document.querySelectorAll('.auto-expand-textarea');
      textareas.forEach((element) => {
        // Add proper type casting
        const textarea = element as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }, 0);
  }

  fetchForm(): void {
    this.http.get('api/userform/active-form').subscribe({
      next: (data: any) => {
        this.form = data;
        if (data.formId && this.user.claims.id) {
          this.http.get(`api/userform/questions/${data.formId}/${this.user.claims.id}`).subscribe({
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
              this.loading = false;
            },
            error: () => {
              this.errorMessage = 'Failed to load questions. Please try again later.';
              this.loading = false;
            }
          });
        } else {
          this.errorMessage = 'Failed to load the form. Please try again later.';
          this.loading = false;
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load the form. Please try again later.';
        this.loading = false;
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

  isOptionSelected(question: any): boolean {
    return question.options?.some((option: any) => option.selected);
  }

  isSelectionSelected(question: any): boolean {
    return !!question.answer;
  }

  validateMultipleChoice(question: any): void {
    question.valid = this.isOptionSelected(question);
  }

  validateSingleChoice(question: any): void {
    question.valid = this.isSelectionSelected(question);
  }

  submitForm(applicationForm: NgForm): void {

    Object.keys(applicationForm.controls).forEach((field) => {
      const control = applicationForm.controls[field];
      control.markAsTouched({ onlySelf: true });
    });

    if (applicationForm.invalid) {
      this.errorMessage = 'Please fill out all required fields.';
      return;
    }

    this.isSubmitting = true;

    const initialAnswers: any[] = [];

    this.form.questions.forEach((q: any) => {
      if (this.isMultipleChoice(q)) {
        q.options
          .filter((o: any) => o.selected)
          .forEach((o: any) => {
            const existingAnswer = q.answer.find((a: any) => a.answer === o.answerOption);
            initialAnswers.push({
              QuestionId: q.questionId,
              UserId: this.user.claims.id,
              FormId: this.form.formId,
              Answer: o.answerOption
            });
          });
      } else {
        initialAnswers.push({
          QuestionId: q.questionId,
          UserId: this.user.claims.id,
          FormId: this.form.formId,
          Answer: q.answer?.answer
        });
      }
    });

    if (this.firstForm) {
      this.http.put('api/userform/save', initialAnswers, { withCredentials: true, observe: 'response' }).subscribe({
        next: (response: HttpResponse<any>) => {
          const dependentQuestions = response.body;
          this.submissionId = response.headers.get('submissionId');
          if (dependentQuestions && dependentQuestions.length > 0) {
            this.form.questions = dependentQuestions.map((q: any) => {
              if (q.answer && q.answer.length > 0) {
                if (this.isMultipleChoice(q)) {
                  q.options = q.options.map((o: any) => ({
                    ...o,
                    selected: q.answer.some((a: any) => a.answer === o.answerOption),
                  }));
                } else {
                  q.answer = q.answer[0] || null;
                }
              }
              return q;
            });
            this.firstForm = false;
            this.isSubmitting = false;
            this.errorMessage = '';
          } else {
            const answers: any[] = [];
            answers.push({
              FormId: this.form.formId,
              UserId: this.user.claims.id,
              SubmissionId: this.submissionId
            });
            this.http.put('api/userform/save-and-submit', answers, { withCredentials: true }).subscribe({
              next: () => {
                this.errorMessage = '';
                this.router.navigate(['apply/thank-you']); // Redirect to a success page
                this.isSubmitting = false;
              },
              error: () => {
                this.errorMessage = 'Failed to submit dependent questions. Please try again.';
                this.isSubmitting = false;
              },
            });
          }
        },
        error: () => {
          this.errorMessage = 'Failed to load dependent questions. Please try again later.';
        },
      });
    } else {
      this.submitDependentQuestions(applicationForm);
    }
  }

  submitDependentQuestions(applicationForm: NgForm): void {

    Object.keys(applicationForm.controls).forEach((field) => {
      const control = applicationForm.controls[field];
      control.markAsTouched({ onlySelf: true });
    });

    if (applicationForm.invalid) {
      this.errorMessage = 'Please fill out all required fields.';
      return;
    }

    this.isSubmitting = true;

    const submitAnswers: any[] = [];

    this.form.questions.forEach((q: any) => {
      if (this.isMultipleChoice(q)) {
        q.options
          .filter((o: any) => o.selected)
          .forEach((o: any) => {
            const existingAnswer = q.answer.find((a: any) => a.answer === o.answerOption);
            submitAnswers.push({
              QuestionId: q.questionId,
              UserId: this.user.claims.id,
              FormId: this.form.formId,
              SubmissionId: this.submissionId,
              Answer: o.answerOption
            });
          });
      } else {
        submitAnswers.push({
          QuestionId: q.questionId,
          UserId: this.user.claims.id,
          FormId: this.form.formId,
          SubmissionId: this.submissionId,
          Answer: q.answer?.answer,
        });
      }
    });

    this.http.put('api/userform/save-and-submit', submitAnswers, { withCredentials: true }).subscribe({
      next: () => {
        this.errorMessage = '';
        this.router.navigate(['apply/thank-you']);
        this.isSubmitting = false;
      },
      error: () => {
        this.errorMessage = 'Failed to submit form. Please try again.';
        this.isSubmitting = false;
      },
    });
  }

  reapply(): void {
    this.showPopup = false;
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  refreshPage(): void {
    this.authService.refreshUserInfo();
    window.location.reload();
  }
}
