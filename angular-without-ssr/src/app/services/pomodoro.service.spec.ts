import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { PomodoroService, PomodoroPhase } from './pomodoro.service';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesDTO } from '../../types';
import { of } from 'rxjs';

function createMockPreferences(): UserPreferencesDTO {
  return {
    id: 1,
    user_id: 'user-123',
    theme: 'light',
    language: 'pl',
    onboarding_completed: true,
    current_streak: 0,
    longest_streak: 0,
    last_study_date: null,
    total_sessions: 0,
    total_cards_reviewed: 0,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: false,
    pomodoro_notifications_enabled: false,
    pomodoro_focus_reminder_dismissed: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };
}

describe('PomodoroService', () => {
  let service: PomodoroService;
  let prefsServiceMock: jasmine.SpyObj<UserPreferencesService>;

  beforeEach(() => {
    prefsServiceMock = jasmine.createSpyObj('UserPreferencesService', ['getPreferences', 'clearCache']);
    prefsServiceMock.getPreferences.and.returnValue(of(createMockPreferences()));

    localStorage.removeItem('10x_pomodoro_state');

    TestBed.configureTestingModule({
      providers: [
        PomodoroService,
        { provide: UserPreferencesService, useValue: prefsServiceMock }
      ]
    });
    service = TestBed.inject(PomodoroService);
  });

  afterEach(() => {
    localStorage.removeItem('10x_pomodoro_state');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have idle state by default', () => {
      expect(service.isRunning()).toBe(false);
      expect(service.phase()).toBe('work');
      expect(service.timeRemaining()).toBe(0);
      expect(service.sessionsCompleted()).toBe(0);
    });
  });

  describe('loadSettings', () => {
    it('should load settings from UserPreferencesService', (done: DoneFn) => {
      service.loadSettings().subscribe({
        next: (prefs) => {
          expect(prefs.pomodoro_work_duration).toBe(25);
          expect(prefsServiceMock.getPreferences).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });
    });
  });

  describe('start', () => {
    it('should not start if settings not loaded', () => {
      service.start();
      expect(service.isRunning()).toBe(false);
    });

    it('should start timer after settings are loaded', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      expect(service.isRunning()).toBe(true);
      expect(service.phase()).toBe('work');
      expect(service.timeRemaining()).toBe(25 * 60);

      discardPeriodicTasks();
    }));

    it('should persist state to localStorage on start', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      const stored = localStorage.getItem('10x_pomodoro_state');
      expect(stored).toBeTruthy();

      const state = JSON.parse(stored!);
      expect(state.isRunning).toBe(true);
      expect(state.phase).toBe('work');

      discardPeriodicTasks();
    }));
  });

  describe('timer decrement', () => {
    it('should decrement timeRemaining via Date.now computation', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      const initialTime = service.timeRemaining();

      tick(3000);
      expect(service.timeRemaining()).toBe(initialTime - 3);

      discardPeriodicTasks();
    }));
  });

  describe('pause and resume', () => {
    it('should pause the timer', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      tick(5000);

      service.pause();
      expect(service.isRunning()).toBe(false);
      const timeAtPause = service.timeRemaining();

      tick(5000);
      expect(service.timeRemaining()).toBe(timeAtPause);
    }));

    it('should resume from paused time', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      tick(5000);

      service.pause();
      const timeAtPause = service.timeRemaining();

      service.resume();
      expect(service.isRunning()).toBe(true);

      tick(3000);
      expect(service.timeRemaining()).toBe(timeAtPause - 3);

      discardPeriodicTasks();
    }));

    it('should persist state on pause', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      tick(2000);
      service.pause();

      const stored = JSON.parse(localStorage.getItem('10x_pomodoro_state')!);
      expect(stored.isRunning).toBe(false);
      expect(stored.pausedTimeRemaining).toBe(service.timeRemaining());
    }));
  });

  describe('phase transitions', () => {
    it('should transition from work to break when timer completes', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      tick(25 * 60 * 1000);

      expect(service.phase()).toBe('break');
      expect(service.sessionsCompleted()).toBe(1);
      expect(service.isRunning()).toBe(true);
      expect(service.timeRemaining()).toBe(5 * 60);

      discardPeriodicTasks();
    }));

    it('should transition from break to work', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      // Complete a work session
      service.start();
      tick(25 * 60 * 1000);

      // Now in break, complete it
      tick(5 * 60 * 1000);

      expect(service.phase()).toBe('work');
      expect(service.isRunning()).toBe(true);

      discardPeriodicTasks();
    }));

    it('should transition to longBreak after 4 work sessions', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();

      // Complete 3 work + break cycles
      for (let i = 0; i < 3; i++) {
        tick(25 * 60 * 1000); // work
        tick(5 * 60 * 1000);  // break
      }

      // Complete 4th work session
      tick(25 * 60 * 1000);

      expect(service.phase()).toBe('longBreak');
      expect(service.sessionsCompleted()).toBe(4);
      expect(service.timeRemaining()).toBe(15 * 60);

      discardPeriodicTasks();
    }));
  });

  describe('skip', () => {
    it('should transition to next phase when skipping', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      tick(5000);

      service.skip();
      expect(service.phase()).toBe('break');
      expect(service.sessionsCompleted()).toBe(1);
      expect(service.isRunning()).toBe(true);

      discardPeriodicTasks();
    }));

    it('should skip break to go back to work', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      service.skip(); // skip work -> break

      service.skip(); // skip break -> work
      expect(service.phase()).toBe('work');

      discardPeriodicTasks();
    }));
  });

  describe('reset', () => {
    it('should clear all state and localStorage', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      service.start();
      tick(5000);

      service.reset();
      expect(service.isRunning()).toBe(false);
      expect(service.phase()).toBe('work');
      expect(service.sessionsCompleted()).toBe(0);
      expect(service.timeRemaining()).toBe(0);
      expect(localStorage.getItem('10x_pomodoro_state')).toBeNull();
    }));
  });

  describe('restoreState', () => {
    it('should do nothing if settings not loaded', () => {
      localStorage.setItem('10x_pomodoro_state', JSON.stringify({
        startedAt: Date.now(),
        phase: 'work',
        sessionsCompleted: 0,
        isRunning: true,
        pausedTimeRemaining: null
      }));

      service.restoreState();
      expect(service.isRunning()).toBe(false);
    });

    it('should restore a running timer from localStorage', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      const startedAt = Date.now() - 60000; // started 60s ago
      localStorage.setItem('10x_pomodoro_state', JSON.stringify({
        startedAt,
        phase: 'work' as PomodoroPhase,
        sessionsCompleted: 2,
        isRunning: true,
        pausedTimeRemaining: null
      }));

      service.restoreState();

      expect(service.isRunning()).toBe(true);
      expect(service.phase()).toBe('work');
      expect(service.sessionsCompleted()).toBe(2);
      expect(service.timeRemaining()).toBe(25 * 60 - 60);

      discardPeriodicTasks();
    }));

    it('should restore a paused timer from localStorage', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      localStorage.setItem('10x_pomodoro_state', JSON.stringify({
        startedAt: 0,
        phase: 'break' as PomodoroPhase,
        sessionsCompleted: 1,
        isRunning: false,
        pausedTimeRemaining: 180
      }));

      service.restoreState();

      expect(service.isRunning()).toBe(false);
      expect(service.phase()).toBe('break');
      expect(service.sessionsCompleted()).toBe(1);
      expect(service.timeRemaining()).toBe(180);
    }));

    it('should reset when localStorage state is expired', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      const startedAt = Date.now() - (30 * 60 * 1000); // started 30 min ago, work is only 25 min
      localStorage.setItem('10x_pomodoro_state', JSON.stringify({
        startedAt,
        phase: 'work' as PomodoroPhase,
        sessionsCompleted: 0,
        isRunning: true,
        pausedTimeRemaining: null
      }));

      service.restoreState();

      expect(service.isRunning()).toBe(false);
      expect(service.phase()).toBe('work');
      expect(service.sessionsCompleted()).toBe(0);
      expect(service.timeRemaining()).toBe(0);
      expect(localStorage.getItem('10x_pomodoro_state')).toBeNull();
    }));

    it('should remove invalid JSON from localStorage', fakeAsync(() => {
      service.loadSettings().subscribe();
      tick();

      localStorage.setItem('10x_pomodoro_state', 'not-valid-json');

      service.restoreState();
      expect(localStorage.getItem('10x_pomodoro_state')).toBeNull();
    }));
  });

  describe('reloadSettings', () => {
    it('should clear cache and reload settings', () => {
      service.reloadSettings();
      expect(prefsServiceMock.clearCache).toHaveBeenCalled();
      expect(prefsServiceMock.getPreferences).toHaveBeenCalled();
    });
  });
});
