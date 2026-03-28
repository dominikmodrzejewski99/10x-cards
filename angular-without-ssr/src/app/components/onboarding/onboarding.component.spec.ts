import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { OnboardingComponent } from './onboarding.component';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { UserPreferencesDTO } from '../../../types';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let preferencesServiceSpy: jasmine.SpyObj<UserPreferencesService>;

  const mockPreferences: UserPreferencesDTO = {
    id: 1,
    user_id: 'user-1',
    theme: 'light',
    onboarding_completed: false,
    current_streak: 0,
    longest_streak: 0,
    last_study_date: null,
    total_sessions: 0,
    total_cards_reviewed: 0,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true,
    pomodoro_focus_reminder_dismissed: false,
    created_at: '2026-01-01',
    updated_at: '2026-01-01'
  };

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    preferencesServiceSpy = jasmine.createSpyObj<UserPreferencesService>(
      'UserPreferencesService',
      ['getPreferences', 'setOnboardingCompleted']
    );
    preferencesServiceSpy.getPreferences.and.returnValue(of(mockPreferences));
    preferencesServiceSpy.setOnboardingCompleted.and.returnValue(of(mockPreferences));

    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: UserPreferencesService, useValue: preferencesServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('should start at step 0', () => {
      expect(component.currentStep()).toBe(0);
    });

    it('should not be visible initially', () => {
      expect(component.visible()).toBeFalse();
    });

    it('should have 5 steps', () => {
      expect(component.steps.length).toBe(5);
    });
  });

  describe('getters', () => {
    it('step should return the current step data', () => {
      expect(component.step.title).toContain('Witaj w');
      expect(component.step.title).toContain('Memlo');
    });

    it('isFirst should return true on first step', () => {
      expect(component.isFirst).toBeTrue();
    });

    it('isLast should return false on first step', () => {
      expect(component.isLast).toBeFalse();
    });

    it('isLast should return true on last step', () => {
      component.currentStep.set(component.steps.length - 1);
      expect(component.isLast).toBeTrue();
    });
  });

  describe('navigation', () => {
    it('should advance to next step', () => {
      component.next();
      expect(component.currentStep()).toBe(1);
    });

    it('should not advance past the last step', () => {
      component.currentStep.set(component.steps.length - 1);
      component.next();
      expect(component.currentStep()).toBe(component.steps.length - 1);
    });

    it('should go to previous step', () => {
      component.currentStep.set(2);
      component.prev();
      expect(component.currentStep()).toBe(1);
    });

    it('should not go before the first step', () => {
      component.prev();
      expect(component.currentStep()).toBe(0);
    });
  });

  describe('show', () => {
    it('should reset step to 0 and make visible', () => {
      component.currentStep.set(3);
      component.show();
      expect(component.currentStep()).toBe(0);
      expect(component.visible()).toBeTrue();
    });
  });

  describe('checkAndShow', () => {
    it('should show onboarding when onboarding_completed is false', () => {
      component.checkAndShow();
      expect(component.visible()).toBeTrue();
    });

    it('should not show onboarding when onboarding_completed is true', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(
        of({ ...mockPreferences, onboarding_completed: true })
      );
      component.checkAndShow();
      expect(component.visible()).toBeFalse();
    });

    it('should show onboarding on error (fallback)', () => {
      preferencesServiceSpy.getPreferences.and.returnValue(
        throwError(() => new Error('DB error'))
      );
      component.checkAndShow();
      expect(component.visible()).toBeTrue();
    });
  });

  describe('skip', () => {
    it('should hide dialog and mark onboarding completed', () => {
      component.show();
      component.skip();
      expect(component.visible()).toBeFalse();
      expect(preferencesServiceSpy.setOnboardingCompleted).toHaveBeenCalled();
    });
  });

  describe('finish', () => {
    it('should hide dialog, mark completed, and navigate to dashboard', () => {
      component.show();
      component.finish();
      expect(component.visible()).toBeFalse();
      expect(preferencesServiceSpy.setOnboardingCompleted).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
