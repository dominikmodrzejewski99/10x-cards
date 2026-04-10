import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PomodoroTimerComponent } from './pomodoro-timer.component';
import { PomodoroFacadeService } from '../../../services/pomodoro-facade.service';

describe('PomodoroTimerComponent', () => {
  let component: PomodoroTimerComponent;
  let fixture: ComponentFixture<PomodoroTimerComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    isRunningSignal: jasmine.createSpy('isRunningSignal').and.returnValue(false),
    timeRemainingSignal: jasmine.createSpy('timeRemainingSignal').and.returnValue(0),
    phaseSignal: jasmine.createSpy('phaseSignal').and.returnValue('work'),
    sessionsCompletedSignal: jasmine.createSpy('sessionsCompletedSignal').and.returnValue(0),
    sessionsBeforeLongBreakSignal: jasmine.createSpy('sessionsBeforeLongBreakSignal').and.returnValue(4),
    showFocusReminderSignal: jasmine.createSpy('showFocusReminderSignal').and.returnValue(false),
    focusReminderDismissedSignal: jasmine.createSpy('focusReminderDismissedSignal').and.returnValue(false),

    init: jasmine.createSpy('init'),
    start: jasmine.createSpy('start').and.returnValue(true),
    startConfirmed: jasmine.createSpy('startConfirmed'),
    dismissFocusReminder: jasmine.createSpy('dismissFocusReminder'),
    pause: jasmine.createSpy('pause'),
    resume: jasmine.createSpy('resume'),
    reset: jasmine.createSpy('reset'),
    skip: jasmine.createSpy('skip'),
    formatTime: jasmine.createSpy('formatTime').and.callFake((seconds: number) => {
      const m: number = Math.floor(seconds / 60);
      const s: number = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }),
    getDefaultDuration: jasmine.createSpy('getDefaultDuration').and.returnValue(1500),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    // Reset return values that may have been mutated by previous tests
    facadeMock['isRunningSignal'].and.returnValue(false);
    facadeMock['timeRemainingSignal'].and.returnValue(0);
    facadeMock['phaseSignal'].and.returnValue('work');
    facadeMock['sessionsCompletedSignal'].and.returnValue(0);
    facadeMock['sessionsBeforeLongBreakSignal'].and.returnValue(4);
    facadeMock['showFocusReminderSignal'].and.returnValue(false);
    facadeMock['focusReminderDismissedSignal'].and.returnValue(false);
    facadeMock['start'].and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [PomodoroTimerComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PomodoroFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroTimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call facade.init on ngOnInit', () => {
    expect(facadeMock['init']).toHaveBeenCalledTimes(1);
  });

  it('should show inactive trigger button when timer not running', () => {
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.pomodoro-trigger');

    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain('Pomodoro');
  });

  it('should show timer badge when running', () => {
    facadeMock['isRunningSignal'].and.returnValue(true);
    facadeMock['timeRemainingSignal'].and.returnValue(1500);
    facadeMock['phaseSignal'].and.returnValue('work');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('.pomodoro-badge--work');

    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('25:00');

    const trigger = el.querySelector('.pomodoro-trigger');
    expect(trigger).toBeNull();
  });

  it('should delegate onPause to facade.pause()', () => {
    component.onPause();

    expect(facadeMock['pause']).toHaveBeenCalled();
  });

  it('should delegate onResume to facade.resume()', () => {
    component.onResume();

    expect(facadeMock['resume']).toHaveBeenCalled();
  });

  it('should delegate onSkip to facade.skip()', () => {
    component.onSkip();

    expect(facadeMock['skip']).toHaveBeenCalled();
  });

  it('should delegate onReset to facade.reset()', () => {
    component.onReset();

    expect(facadeMock['reset']).toHaveBeenCalled();
  });
});
