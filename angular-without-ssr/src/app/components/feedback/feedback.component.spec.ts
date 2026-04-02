import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { FeedbackComponent } from './feedback.component';
import { FeedbackApiService } from '../../services/feedback-api.service';
import { FeedbackDTO } from '../../../types';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;
  let mockFeedbackApi: jasmine.SpyObj<FeedbackApiService>;

  const mockFeedbackResponse: FeedbackDTO = {
    id: 1,
    user_id: 'user-123',
    type: 'bug',
    title: 'Test bug',
    description: 'Test description for the bug',
    created_at: '2026-04-02T00:00:00Z'
  };

  beforeEach(() => {
    mockFeedbackApi = jasmine.createSpyObj('FeedbackApiService', ['submitFeedback']);
    mockFeedbackApi.submitFeedback.and.returnValue(of(mockFeedbackResponse));

    TestBed.configureTestingModule({
      imports: [
        FeedbackComponent,
        ReactiveFormsModule,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        { provide: FeedbackApiService, useValue: mockFeedbackApi },
        MessageService,
      ]
    });

    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to bug type', () => {
    expect(component.selectedTypeSignal()).toBe('bug');
  });

  it('should switch type to idea', () => {
    component.selectType('idea');
    expect(component.selectedTypeSignal()).toBe('idea');
  });

  it('should not submit when form is invalid', () => {
    component.submit();
    expect(mockFeedbackApi.submitFeedback).not.toHaveBeenCalled();
  });

  it('should mark form as touched on invalid submit', () => {
    component.submit();
    expect(component.feedbackForm.get('title')?.touched).toBeTrue();
    expect(component.feedbackForm.get('description')?.touched).toBeTrue();
  });

  it('should submit when form is valid', () => {
    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug'
    });
    component.selectType('bug');

    component.submit();

    expect(mockFeedbackApi.submitFeedback).toHaveBeenCalledWith({
      type: 'bug',
      title: 'Test bug title',
      description: 'This is a detailed description of the bug'
    });
  });

  it('should show success state after submission', () => {
    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug'
    });

    component.submit();

    expect(component.submittedSignal()).toBeTrue();
    expect(component.submittingSignal()).toBeFalse();
  });

  it('should reset form after successful submission', () => {
    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug'
    });

    component.submit();

    expect(component.feedbackForm.get('title')?.value).toBeNull();
    expect(component.feedbackForm.get('description')?.value).toBeNull();
  });

  it('should handle submission error', () => {
    mockFeedbackApi.submitFeedback.and.returnValue(throwError(() => new Error('Network error')));

    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug'
    });

    component.submit();

    expect(component.submittedSignal()).toBeFalse();
    expect(component.submittingSignal()).toBeFalse();
  });

  it('should allow sending another after success', () => {
    component.submittedSignal.set(true);
    component.selectType('idea');

    component.sendAnother();

    expect(component.submittedSignal()).toBeFalse();
    expect(component.selectedTypeSignal()).toBe('bug');
  });

  it('should validate title minimum length', () => {
    component.feedbackForm.get('title')?.setValue('ab');
    component.feedbackForm.get('title')?.markAsTouched();
    expect(component.feedbackForm.get('title')?.hasError('minlength')).toBeTrue();
  });

  it('should validate description minimum length', () => {
    component.feedbackForm.get('description')?.setValue('short');
    component.feedbackForm.get('description')?.markAsTouched();
    expect(component.feedbackForm.get('description')?.hasError('minlength')).toBeTrue();
  });

  it('should not submit while already submitting', () => {
    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug'
    });
    component.submittingSignal.set(true);

    component.submit();

    expect(mockFeedbackApi.submitFeedback).not.toHaveBeenCalled();
  });

  it('should render type selector buttons', () => {
    const buttons: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.feedback__type-btn');
    expect(buttons.length).toBe(2);
  });

  it('should render form inputs', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#feedback-title');
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#feedback-desc');
    expect(input).toBeTruthy();
    expect(textarea).toBeTruthy();
  });
});
