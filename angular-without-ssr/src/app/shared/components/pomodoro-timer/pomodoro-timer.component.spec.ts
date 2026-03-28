import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of } from 'rxjs';
import { PomodoroTimerComponent } from './pomodoro-timer.component';
import { PomodoroService, PomodoroPhase } from '../../../services/pomodoro.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';

describe('PomodoroTimerComponent', () => {
  let component: PomodoroTimerComponent;
  let fixture: ComponentFixture<PomodoroTimerComponent>;

  const isRunning = signal(false);
  const timeRemaining = signal(0);
  const phase = signal<PomodoroPhase>('work');
  const sessionsCompleted = signal(0);

  const mockPomodoroService = {
    isRunning: isRunning.asReadonly(),
    timeRemaining: timeRemaining.asReadonly(),
    phase: phase.asReadonly(),
    sessionsCompleted: sessionsCompleted.asReadonly(),
    loadSettings: jasmine.createSpy('loadSettings').and.returnValue(of({})),
    restoreState: jasmine.createSpy('restoreState'),
    start: jasmine.createSpy('start'),
    pause: jasmine.createSpy('pause'),
    resume: jasmine.createSpy('resume'),
    reset: jasmine.createSpy('reset'),
    skip: jasmine.createSpy('skip')
  };

  const mockPrefsService = {
    getPreferences: jasmine.createSpy('getPreferences').and.returnValue(of({
      pomodoro_focus_reminder_dismissed: false,
      pomodoro_sessions_before_long_break: 4
    })),
    updatePreferences: jasmine.createSpy('updatePreferences').and.returnValue(of({}))
  };

  beforeEach(async () => {
    // Reset signal values
    isRunning.set(false);
    timeRemaining.set(0);
    phase.set('work');
    sessionsCompleted.set(0);

    await TestBed.configureTestingModule({
      imports: [PomodoroTimerComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PomodoroService, useValue: mockPomodoroService },
        { provide: UserPreferencesService, useValue: mockPrefsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show inactive trigger button when timer not running', () => {
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.pomodoro-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain('Pomodoro');
  });

  it('should show timer badge when running', () => {
    isRunning.set(true);
    timeRemaining.set(1500);
    phase.set('work');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('.pomodoro-badge--work');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('25:00');

    const trigger = el.querySelector('.pomodoro-trigger');
    expect(trigger).toBeNull();
  });

  it('should toggle dropdown', () => {
    expect(component.isDropdownOpenSignal()).toBe(false);
    component.toggleDropdown();
    expect(component.isDropdownOpenSignal()).toBe(true);
    component.toggleDropdown();
    expect(component.isDropdownOpenSignal()).toBe(false);
  });

  it('should format time correctly', () => {
    expect(component.formatTime(1500)).toBe('25:00');
    expect(component.formatTime(65)).toBe('01:05');
    expect(component.formatTime(0)).toBe('00:00');
  });
});
