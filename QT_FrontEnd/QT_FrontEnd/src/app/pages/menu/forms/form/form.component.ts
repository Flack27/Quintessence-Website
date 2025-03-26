import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {
  form: any = {
    title: '',
    description: '',
    questions: []
  };
  questionTypes: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';
  minorErrorMessage: string = '';

  constructor(private http: HttpClient, private route: ActivatedRoute, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    const formId = this.route.snapshot.paramMap.get('formId');
    if (formId) {
      this.fetchForm(formId);
    }
    this.fetchQuestionTypes();
  }

  fetchQuestionTypes(): void {
    this.http.get('api/DropDown/quetiontypes').subscribe({
      next: (types: any) => {
        this.questionTypes = types;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load question types. Please try again later.';
        this.loading = false;
      }
    });
  }

  addOption(question: any): void {
    const baseName = "New Option";
    let uniqueName = baseName;
    let counter = 1;
    while (question.options.some((opt: any) => opt.answerOption === uniqueName)) {
      uniqueName = `${baseName} ${counter}`;
      counter++;
    }

    const newOption = { optionId: null, answerOption: uniqueName };
    question.options.push(newOption);
    this.saveQuestionChanges(question);
  }

  removeOption(question: any, index: number): void {
    question.options.splice(index, 1);
    this.saveQuestionChanges(question);
  }


  saveFormChanges(): void {
    const updateData = {
      FormId: this.form.formId,
      Title: this.form.title,
      Description: this.form.description
    };

    this.http.put(`api/menu/form/update-form`, updateData, { withCredentials: true }).subscribe({
      next: () => {
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Failed to save form changes. Please try again.';
      }
    });
  }

  addQuestion(): void {
    const newQuestion = {
      FormId: this.form.formId,
      QuestionText: 'New Question',
      TypeId: this.questionTypes[0]?.typeId || 1,
      IsRequired: false
    };
    this.http.put('api/menu/question/add', newQuestion, { withCredentials: true }).subscribe({
      next: (response: any) => {
        if (response && response.questionId) {
          this.form.questions.push(response);
          this.errorMessage = '';
        } else {
          this.errorMessage = 'Failed to add question. Invalid server response.';
        }
      },
      error: (err) => {
        console.error('Failed to add question:', err);
        this.errorMessage = 'Failed to add question. Please try again.';
      }
    });
  }

  deleteQuestion(questionId: number): void {
    if (confirm('Are you sure you want to delete this question?')) {
      this.http.get(`api/menu/question/delete/${questionId}`, { withCredentials: true }).subscribe({
        next: () => {
          this.form.questions = this.form.questions.filter((q: any) => q.questionId !== questionId);
          this.errorMessage = '';
        },
        error: () => {
          this.errorMessage = 'Failed to delete question. Please try again.';
        }
      });
    }
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


  saveQuestionChanges(question: any): void {
    const updateData = {
      FormId: this.form.formId,
      QuestionId: question.questionId,
      QuestionText: question.questionText,
      TypeId: question.typeId,
      IsRequired: question.isRequired,
      Options: question.options.map((o: any) => ({
        optionId: o.optionId,
        answerOption: o.answerOption
      }))
    };

    this.http.put(`api/menu/question/update`, updateData, { withCredentials: true }).subscribe({
      next: () => {
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'Failed to save question changes. Please try again.';
      }
    });
  }

  fetchForm(formId: string): void {
    this.http.get(`api/menu/form/${formId}`, { withCredentials: true }).subscribe({
      next: (data: any) => {
        this.form = data;
        this.form.questions.forEach((q: any) => {
          q.options = q.options.map((o: any) => ({
            optionId: o.optionId,
            answerOption: o.answerOption
          }));
          if (q.questionDependency) {
            q.dependencyQuestionId = q.questionDependency.dependsOnQuestionId;
            q.requiredAnswer = q.questionDependency.requiredAnswer;
          } else {
            q.dependencyQuestionId = null;
            q.requiredAnswer = null;
          }
        });
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load form. Please try again later.';
        this.loading = false;
      }
    });
  }



  onDependencyQuestionChange(question: any): void {
    const answerOptions = this.getAnswerOptions(question.dependencyQuestionId);
    question.requiredAnswer = answerOptions.length > 0 ? answerOptions[0].answerOption : null;
  }


  getAnswerOptions(dependencyQuestionId: number): any[] {
    if (!dependencyQuestionId) {
      return [];
    }
    const dependencyQuestion = this.form.questions.find((q: any) => q.questionId === Number(dependencyQuestionId));
    return dependencyQuestion?.options || [];
  }

  getEligibleDependencyQuestions(currentQuestion: any): any[] {
    return this.form.questions.filter((q: any) =>
      (this.isMultipleChoice(q) || this.isDropdown(q) || this.isSingleChoice(q)) &&
      q.questionId !== currentQuestion.questionId
    );
  }

  saveDependency(question: any): void {
    question.errorMessage = '';
    question.succesMessage = '';

    if (question.dependencyQuestionId && (!question.requiredAnswer || question.requiredAnswer.trim() === '')) {
      question.errorMessage = 'Required answer is mandatory.';
      return;
    }

    if (!question.dependencyQuestionId) {
      this.http.get(`api/menu/question/delete-dependency/${question.questionId}`, { withCredentials: true }).subscribe({
        next: () => {
          question.dependencyQuestionId = null;
          question.dependencyAnswerId = null;
          this.errorMessage = '';
          question.succesMessage = 'Dependency deleted';
        },
        error: () => {
          this.errorMessage = 'Failed to delete dependency. Please try again.';
        }
      });
    } else {
      // Save dependency
      const dependencyData = {
        QuestionId: question.questionId,
        DependsOnQuestionId: question.dependencyQuestionId,
        RequiredAnswer: question.requiredAnswer
      };

      this.http.put('api/menu/question/save-dependency', dependencyData, { withCredentials: true }).subscribe({
        next: () => {
          this.errorMessage = '';
          question.succesMessage = 'Dependency added';
        },
        error: () => {
          this.errorMessage = 'Failed to save dependency. Please try again.';
        }
      });
    }
  }
}
