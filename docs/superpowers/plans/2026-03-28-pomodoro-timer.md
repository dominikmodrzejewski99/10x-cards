# Pomodoro Timer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Pomodoro timer with navbar widget, settings page, and browser notifications to help users focus during study sessions.

**Architecture:** PomodoroService (root singleton with signals) manages timer state, persists to localStorage, and fires notifications. PomodoroTimerComponent renders in the navbar. SettingsPageComponent provides a new `/settings` route for configuring durations and toggles. Supabase migration adds preference columns to `user_preferences`.

**Tech Stack:** Angular 21 (zoneless, signals, OnPush), PrimeNG (Dialog, InputNumber, ToggleSwitch), Supabase (migration), Browser Notification API, Audio API, localStorage

---

## File Structure

### New Files
- `angular-without-ssr/src/app/services/pomodoro.service.ts` — timer state machine, signals, localStorage persistence, notifications
- `angular-without-ssr/src/app/services/pomodoro.service.spec.ts` — unit tests
- `angular-without-ssr/src/app/shared/components/pomodoro-timer/pomodoro-timer.component.ts` — navbar widget (inline template)
- `angular-without-ssr/src/app/shared/components/pomodoro-timer/pomodoro-timer.component.scss` — widget styles
- `angular-without-ssr/src/app/shared/components/pomodoro-timer/pomodoro-timer.component.spec.ts` — widget tests
- `angular-without-ssr/src/app/components/settings/settings.component.ts` — settings page (inline template)
- `angular-without-ssr/src/app/components/settings/settings.component.scss` — settings page styles
- `angular-without-ssr/src/app/components/settings/settings.component.spec.ts` — settings page tests
- `angular-without-ssr/src/assets/sounds/pomodoro-bell.mp3` — notification sound
- `supabase/migrations/YYYYMMDDHHMMSS_add_pomodoro_preferences.sql` — DB migration

### Modified Files
- `angular-without-ssr/src/types.ts:171-183` — extend `UserPreferencesDTO` with pomodoro fields
- `angular-without-ssr/src/app/services/user-preferences.service.ts:50,112-126` — widen `updatePreferences()` type, update `defaultPrefs()`
- `angular-without-ssr/src/app/app.routes.ts` — add `/settings` route
- `angular-without-ssr/src/app/shared/components/auth-navbar.component.ts:9,82-84` — import and render `PomodoroTimerComponent`
- `angular-without-ssr/src/app/shared/components/bottom-nav/bottom-nav.component.ts` — add compact timer badge on mobile
- `angular-without-ssr/src/app/shared/components/bottom-nav/bottom-nav.component.scss` — timer badge styles
- `angular-without-ssr/src/app/auth/components/user-menu.component.ts:11` — add RouterModule import
- `angular-without-ssr/src/app/auth/components/user-menu.component.html:19-26` — add "Ustawienia" link

---

## Chunk 1: Data Layer

### Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260328120000_add_pomodoro_preferences.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Add Pomodoro timer preferences to user_preferences
-- Existing RLS policies cover new columns (row-level on user_id)
ALTER TABLE user_preferences
  ADD COLUMN pomodoro_work_duration integer NOT NULL DEFAULT 25,
  ADD COLUMN pomodoro_break_duration integer NOT NULL DEFAULT 5,
  ADD COLUMN pomodoro_long_break_duration integer NOT NULL DEFAULT 15,
  ADD COLUMN pomodoro_sessions_before_long_break integer NOT NULL DEFAULT 4,
  ADD COLUMN pomodoro_sound_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN pomodoro_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN pomodoro_focus_reminder_dismissed boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply migration locally**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260328120000_add_pomodoro_preferences.sql
git commit -m "feat: add Pomodoro preferences columns to user_preferences"
```

### Task 2: Extend TypeScript Types and UserPreferencesService

**Files:**
- Modify: `angular-without-ssr/src/types.ts:171-183`
- Modify: `angular-without-ssr/src/app/services/user-preferences.service.ts:50,112-126`

- [ ] **Step 1: Write failing test for updated defaultPrefs**

Create `angular-without-ssr/src/app/services/user-preferences.service.spec.ts` (if not exists, add test):

```typescript
it('should include pomodoro defaults in defaultPrefs', () => {
  // Access defaultPrefs via getPreferences when no data in DB
  // After extending UserPreferencesDTO, the default object must include:
  // pomodoro_work_duration: 25, pomodoro_break_duration: 5, etc.
  service.getPreferences().subscribe(prefs => {
    expect(prefs.pomodoro_work_duration).toBe(25);
    expect(prefs.pomodoro_break_duration).toBe(5);
    expect(prefs.pomodoro_long_break_duration).toBe(15);
    expect(prefs.pomodoro_sessions_before_long_break).toBe(4);
    expect(prefs.pomodoro_sound_enabled).toBe(true);
    expect(prefs.pomodoro_notifications_enabled).toBe(true);
    expect(prefs.pomodoro_focus_reminder_dismissed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd angular-without-ssr && npx ng test --include="**/user-preferences*" --watch=false`
Expected: FAIL — properties don't exist on UserPreferencesDTO

- [ ] **Step 3: Extend UserPreferencesDTO in types.ts**

Add after line 181 (`total_cards_reviewed: number;`):

```typescript
  pomodoro_work_duration: number;
  pomodoro_break_duration: number;
  pomodoro_long_break_duration: number;
  pomodoro_sessions_before_long_break: number;
  pomodoro_sound_enabled: boolean;
  pomodoro_notifications_enabled: boolean;
  pomodoro_focus_reminder_dismissed: boolean;
```

- [ ] **Step 4: Widen updatePreferences() type**

In `user-preferences.service.ts` line 50, change:

```typescript
// FROM:
updatePreferences(updates: Partial<Pick<UserPreferencesDTO, 'onboarding_completed'>>): Observable<UserPreferencesDTO> {
// TO:
updatePreferences(updates: Partial<Pick<UserPreferencesDTO,
  | 'onboarding_completed'
  | 'pomodoro_work_duration'
  | 'pomodoro_break_duration'
  | 'pomodoro_long_break_duration'
  | 'pomodoro_sessions_before_long_break'
  | 'pomodoro_sound_enabled'
  | 'pomodoro_notifications_enabled'
  | 'pomodoro_focus_reminder_dismissed'
>>): Observable<UserPreferencesDTO> {
```

- [ ] **Step 5: Update defaultPrefs()**

In `user-preferences.service.ts` line 112-126, add pomodoro defaults to the returned object:

```typescript
private defaultPrefs(userId: string): UserPreferencesDTO {
  return {
    id: 0,
    user_id: userId,
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd angular-without-ssr && npx ng test --include="**/user-preferences*" --watch=false`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add angular-without-ssr/src/types.ts angular-without-ssr/src/app/services/user-preferences.service.ts angular-without-ssr/src/app/services/user-preferences.service.spec.ts
git commit -m "feat: extend UserPreferencesDTO with Pomodoro settings fields"
```

---

## Chunk 2: PomodoroService

### Task 3: PomodoroService — Core Timer Logic

**Files:**
- Create: `angular-without-ssr/src/app/services/pomodoro.service.ts`
- Create: `angular-without-ssr/src/app/services/pomodoro.service.spec.ts`

- [ ] **Step 1: Write failing tests for PomodoroService**

```typescript
// pomodoro.service.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PomodoroService, PomodoroPhase } from './pomodoro.service';
import { UserPreferencesService } from './user-preferences.service';
import { of } from 'rxjs';

describe('PomodoroService', () => {
  let service: PomodoroService;
  let mockPrefsService: jasmine.SpyObj<UserPreferencesService>;

  const defaultPrefs = {
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true,
    pomodoro_focus_reminder_dismissed: false
  };

  beforeEach(() => {
    localStorage.clear();
    mockPrefsService = jasmine.createSpyObj('UserPreferencesService', ['getPreferences']);
    mockPrefsService.getPreferences.and.returnValue(of(defaultPrefs as any));

    TestBed.configureTestingModule({
      providers: [
        PomodoroService,
        { provide: UserPreferencesService, useValue: mockPrefsService }
      ]
    });
    service = TestBed.inject(PomodoroService);
  });

  afterEach(() => {
    service.reset();
    localStorage.clear();
  });

  it('should initialize with idle state', () => {
    expect(service.isRunning()).toBe(false);
    expect(service.phase()).toBe('work');
    expect(service.sessionsCompleted()).toBe(0);
  });

  it('should start timer and set isRunning to true', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      expect(service.isRunning()).toBe(true);
      expect(service.phase()).toBe('work');
      expect(service.timeRemaining()).toBe(25 * 60);
    });
    tick();
  }));

  it('should decrement timeRemaining each second', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      tick(3000);
      expect(service.timeRemaining()).toBeLessThanOrEqual(25 * 60 - 2);
    });
    tick();
  }));

  it('should pause and resume correctly', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      tick(5000);
      service.pause();
      expect(service.isRunning()).toBe(false);
      const timeAtPause = service.timeRemaining();
      tick(5000);
      expect(service.timeRemaining()).toBe(timeAtPause);
      service.resume();
      expect(service.isRunning()).toBe(true);
      tick(2000);
      expect(service.timeRemaining()).toBeLessThan(timeAtPause);
    });
    tick();
  }));

  it('should transition from work to break after time expires', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      tick(25 * 60 * 1000 + 1000);
      expect(service.phase()).toBe('break');
      expect(service.sessionsCompleted()).toBe(1);
    });
    tick();
  }));

  it('should transition to longBreak after N sessions', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      // Complete 4 work sessions
      for (let i = 0; i < 4; i++) {
        service.start();
        tick(25 * 60 * 1000 + 1000);
        if (i < 3) {
          // Skip break
          service.skip();
        }
      }
      expect(service.phase()).toBe('longBreak');
    });
    tick();
  }));

  it('should skip current phase', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      tick(1000);
      service.skip();
      expect(service.phase()).toBe('break');
    });
    tick();
  }));

  it('should reset all state', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      tick(5000);
      service.reset();
      expect(service.isRunning()).toBe(false);
      expect(service.phase()).toBe('work');
      expect(service.sessionsCompleted()).toBe(0);
    });
    tick();
  }));

  it('should persist state to localStorage', fakeAsync(() => {
    service.loadSettings().subscribe(() => {
      service.start();
      tick(1000);
      const stored = JSON.parse(localStorage.getItem('10x_pomodoro_state') || '{}');
      expect(stored.isRunning).toBe(true);
      expect(stored.phase).toBe('work');
    });
    tick();
  }));

  it('should restore state from localStorage', fakeAsync(() => {
    const savedState = {
      startedAt: Date.now() - 60000, // 1 minute ago
      phase: 'work' as PomodoroPhase,
      sessionsCompleted: 1,
      isRunning: true,
      pausedTimeRemaining: null
    };
    localStorage.setItem('10x_pomodoro_state', JSON.stringify(savedState));

    service.loadSettings().subscribe(() => {
      service.restoreState();
      expect(service.isRunning()).toBe(true);
      expect(service.phase()).toBe('work');
      expect(service.sessionsCompleted()).toBe(1);
      expect(service.timeRemaining()).toBeLessThanOrEqual(25 * 60 - 59);
    });
    tick();
  }));

  it('should reset if localStorage state is expired', fakeAsync(() => {
    const savedState = {
      startedAt: Date.now() - (30 * 60 * 1000), // 30 min ago, work=25min => expired
      phase: 'work' as PomodoroPhase,
      sessionsCompleted: 1,
      isRunning: true,
      pausedTimeRemaining: null
    };
    localStorage.setItem('10x_pomodoro_state', JSON.stringify(savedState));

    service.loadSettings().subscribe(() => {
      service.restoreState();
      expect(service.isRunning()).toBe(false);
      expect(service.phase()).toBe('work');
      expect(service.sessionsCompleted()).toBe(0);
    });
    tick();
  }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd angular-without-ssr && npx ng test --include="**/pomodoro.service*" --watch=false`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PomodoroService**

```typescript
// pomodoro.service.ts
import { Injectable, inject, signal, WritableSignal, DestroyRef } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';
import { Observable, tap } from 'rxjs';
import { UserPreferencesDTO } from '../../types';

export type PomodoroPhase = 'work' | 'break' | 'longBreak';

interface PomodoroState {
  startedAt: number;
  phase: PomodoroPhase;
  sessionsCompleted: number;
  isRunning: boolean;
  pausedTimeRemaining: number | null;
}

const STORAGE_KEY = '10x_pomodoro_state';

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private prefsService = inject(UserPreferencesService);
  private destroyRef = inject(DestroyRef);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Settings (loaded from Supabase)
  private workDuration = 25 * 60;
  private breakDuration = 5 * 60;
  private longBreakDuration = 15 * 60;
  private sessionsBeforeLongBreak = 4;
  private soundEnabled = true;
  private notificationsEnabled = true;
  private settingsLoaded = false;

  // Signals (private writable, public readonly)
  private readonly _timeRemaining = signal(0);
  private readonly _phase = signal<PomodoroPhase>('work');
  private readonly _isRunning = signal(false);
  private readonly _sessionsCompleted = signal(0);

  public readonly timeRemaining = this._timeRemaining.asReadonly();
  public readonly phase = this._phase.asReadonly();
  public readonly isRunning = this._isRunning.asReadonly();
  public readonly sessionsCompleted = this._sessionsCompleted.asReadonly();

  private startedAt: number = 0;
  private audio: HTMLAudioElement | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearInterval());

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.persistState());
    }
  }

  loadSettings(): Observable<UserPreferencesDTO> {
    return this.prefsService.getPreferences().pipe(
      tap(prefs => {
        this.workDuration = prefs.pomodoro_work_duration * 60;
        this.breakDuration = prefs.pomodoro_break_duration * 60;
        this.longBreakDuration = prefs.pomodoro_long_break_duration * 60;
        this.sessionsBeforeLongBreak = prefs.pomodoro_sessions_before_long_break;
        this.soundEnabled = prefs.pomodoro_sound_enabled;
        this.notificationsEnabled = prefs.pomodoro_notifications_enabled;
        this.settingsLoaded = true;
      })
    );
  }

  start(): void {
    if (!this.settingsLoaded) return;
    this.startedAt = Date.now();
    this._timeRemaining.set(this.getDurationForPhase(this._phase()));
    this._isRunning.set(true);
    this.startInterval();
    this.persistState();
  }

  pause(): void {
    this.clearInterval();
    this._isRunning.set(false);
    this.persistState();
  }

  resume(): void {
    this.startedAt = Date.now() - (this.getDurationForPhase(this._phase()) - this._timeRemaining()) * 1000;
    this._isRunning.set(true);
    this.startInterval();
    this.persistState();
  }

  reset(): void {
    this.clearInterval();
    this._isRunning.set(false);
    this._phase.set('work');
    this._sessionsCompleted.set(0);
    this._timeRemaining.set(0);
    this.startedAt = 0;
    localStorage.removeItem(STORAGE_KEY);
  }

  skip(): void {
    this.clearInterval();
    this.transitionToNextPhase();
  }

  /** Call after saving settings in SettingsPage to pick up new durations */
  reloadSettings(): void {
    this.prefsService.clearCache();
    this.loadSettings().subscribe();
  }

  restoreState(): void {
    if (!this.settingsLoaded) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const state: PomodoroState = JSON.parse(raw);
      const phaseDuration = this.getDurationForPhase(state.phase);

      if (state.isRunning) {
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const remaining = phaseDuration - elapsed;

        if (remaining <= 0) {
          this.reset();
          return;
        }

        this._phase.set(state.phase);
        this._sessionsCompleted.set(state.sessionsCompleted);
        this.startedAt = state.startedAt;
        this._timeRemaining.set(remaining);
        this._isRunning.set(true);
        this.startInterval();
      } else if (state.pausedTimeRemaining !== null) {
        this._phase.set(state.phase);
        this._sessionsCompleted.set(state.sessionsCompleted);
        this._timeRemaining.set(state.pausedTimeRemaining);
        this._isRunning.set(false);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private startInterval(): void {
    this.clearInterval();
    this.intervalId = setInterval(() => {
      if (!this._isRunning()) return;

      const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      const phaseDuration = this.getDurationForPhase(this._phase());
      const remaining = Math.max(0, phaseDuration - elapsed);
      this._timeRemaining.set(remaining);

      if (remaining <= 0) {
        this.onPhaseComplete();
      }
    }, 1000);
  }

  private onPhaseComplete(): void {
    this.clearInterval();
    this.playSound();
    this.sendNotification();
    this.transitionToNextPhase();
  }

  private transitionToNextPhase(): void {
    const currentPhase = this._phase();

    if (currentPhase === 'work') {
      const completed = this._sessionsCompleted() + 1;
      this._sessionsCompleted.set(completed);

      if (completed % this.sessionsBeforeLongBreak === 0) {
        this._phase.set('longBreak');
      } else {
        this._phase.set('break');
      }
    } else {
      this._phase.set('work');
    }

    this.startedAt = Date.now();
    this._timeRemaining.set(this.getDurationForPhase(this._phase()));
    this._isRunning.set(true);
    this.startInterval();
    this.persistState();
  }

  private getDurationForPhase(phase: PomodoroPhase): number {
    switch (phase) {
      case 'work': return this.workDuration;
      case 'break': return this.breakDuration;
      case 'longBreak': return this.longBreakDuration;
    }
  }

  private playSound(): void {
    if (!this.soundEnabled) return;
    try {
      if (!this.audio) {
        this.audio = new Audio('assets/sounds/pomodoro-bell.mp3');
      }
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    } catch {}
  }

  private sendNotification(): void {
    if (!this.notificationsEnabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const title = this._phase() === 'work' ? 'Czas na naukę!' : 'Czas na przerwę!';
    const body = this._phase() === 'work'
      ? `Sesja ${this._sessionsCompleted() + 1} — do dzieła!`
      : 'Odpocznij chwilę, wróć z nową energią.';

    new Notification(title, { body, icon: 'assets/icons/icon-192x192.png' });
  }

  private persistState(): void {
    const state: PomodoroState = {
      startedAt: this.startedAt,
      phase: this._phase(),
      sessionsCompleted: this._sessionsCompleted(),
      isRunning: this._isRunning(),
      pausedTimeRemaining: this._isRunning() ? null : this._timeRemaining()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd angular-without-ssr && npx ng test --include="**/pomodoro.service*" --watch=false`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/services/pomodoro.service.ts angular-without-ssr/src/app/services/pomodoro.service.spec.ts
git commit -m "feat: implement PomodoroService with timer logic and localStorage persistence"
```

---

## Chunk 3: PomodoroTimerComponent (Navbar Widget)

### Task 4: PomodoroTimerComponent

**Files:**
- Create: `angular-without-ssr/src/app/shared/components/pomodoro-timer/pomodoro-timer.component.ts`
- Create: `angular-without-ssr/src/app/shared/components/pomodoro-timer/pomodoro-timer.component.scss`
- Create: `angular-without-ssr/src/app/shared/components/pomodoro-timer/pomodoro-timer.component.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// pomodoro-timer.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PomodoroTimerComponent } from './pomodoro-timer.component';
import { PomodoroService } from '../../../services/pomodoro.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('PomodoroTimerComponent', () => {
  let component: PomodoroTimerComponent;
  let fixture: ComponentFixture<PomodoroTimerComponent>;
  let mockPomodoroService: any;
  let mockPrefsService: jasmine.SpyObj<UserPreferencesService>;

  beforeEach(() => {
    mockPomodoroService = {
      timeRemaining: signal(0),
      phase: signal('work'),
      isRunning: signal(false),
      sessionsCompleted: signal(0),
      loadSettings: jasmine.createSpy().and.returnValue(of({})),
      start: jasmine.createSpy(),
      pause: jasmine.createSpy(),
      resume: jasmine.createSpy(),
      reset: jasmine.createSpy(),
      skip: jasmine.createSpy(),
      restoreState: jasmine.createSpy()
    };

    mockPrefsService = jasmine.createSpyObj('UserPreferencesService', ['getPreferences', 'updatePreferences']);
    mockPrefsService.getPreferences.and.returnValue(of({
      pomodoro_sessions_before_long_break: 4,
      pomodoro_focus_reminder_dismissed: false,
      pomodoro_notifications_enabled: true
    } as any));

    TestBed.configureTestingModule({
      imports: [PomodoroTimerComponent],
      providers: [
        { provide: PomodoroService, useValue: mockPomodoroService },
        { provide: UserPreferencesService, useValue: mockPrefsService }
      ]
    });
    fixture = TestBed.createComponent(PomodoroTimerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show inactive button when timer is not running', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.pomodoro-trigger');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Pomodoro');
  });

  it('should show timer when running', () => {
    mockPomodoroService.isRunning.set(true);
    mockPomodoroService.timeRemaining.set(1500);
    mockPomodoroService.phase.set('work');
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.pomodoro-badge');
    expect(badge).toBeTruthy();
  });

  it('should toggle dropdown on click', () => {
    fixture.detectChanges();
    expect(component.isDropdownOpenSignal()).toBe(false);
    component.toggleDropdown();
    expect(component.isDropdownOpenSignal()).toBe(true);
  });

  it('should format time correctly', () => {
    expect(component.formatTime(1500)).toBe('25:00');
    expect(component.formatTime(65)).toBe('01:05');
    expect(component.formatTime(0)).toBe('00:00');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd angular-without-ssr && npx ng test --include="**/pomodoro-timer*" --watch=false`
Expected: FAIL — component not found

- [ ] **Step 3: Implement PomodoroTimerComponent**

Create `pomodoro-timer.component.ts` with:
- Inline template containing:
  - Inactive state: button with `🍅 Pomodoro` text, class `pomodoro-trigger`
  - Active state: badge with timer and session count, class `pomodoro-badge`
  - Work phase: green badge (`pomodoro-badge--work`)
  - Break phase: blue badge (`pomodoro-badge--break`)
  - Dropdown panel with: large timer, phase label, control buttons (pause/resume, reset, skip), session progress dots, "Zakończ sesję" link
  - Focus reminder dialog (PrimeNG Dialog) shown on first start if not dismissed
- Signals: `isDropdownOpenSignal`, `showFocusReminderSignal`
- Methods: `toggleDropdown()`, `closeDropdown()`, `onStart()`, `onPause()`, `onResume()`, `onReset()`, `onSkip()`, `formatTime(seconds)`, `requestNotificationPermission()`
- `onStart()` checks `pomodoro_focus_reminder_dismissed` — if false, shows dialog first; dialog "Zaczynamy!" button calls `Notification.requestPermission()` then starts
- OnPush, standalone, imports: DialogModule
- Inject: PomodoroService, UserPreferencesService
- **OnInit:** call `pomodoroService.loadSettings().subscribe(() => pomodoroService.restoreState())` to initialize timer state on app load

- [ ] **Step 4: Implement component SCSS**

Create `pomodoro-timer.component.scss` with BEM-style classes using `@use 'variables' as *`:
- `.pomodoro-trigger` — pill button matching navbar style (border, radius-pill, transition)
- `.pomodoro-badge` — compact pill with tabular-nums font
- `.pomodoro-badge--work` — green tint (`$color-success`, success-light background)
- `.pomodoro-badge--break` — blue tint (primary colors)
- `.pomodoro-badge--pulse` — keyframe animation for phase-end pulse
- `.pomodoro-dropdown` — absolute positioned panel, z-index: 51 (above navbar dropdown z-index 50), animation, shadow
- `.pomodoro-dropdown__timer` — large centered timer text
- `.pomodoro-dropdown__controls` — flex row of circle buttons
- `.pomodoro-dropdown__dots` — session progress dots
- `.pomodoro-dropdown__end` — "Zakończ sesję" link
- Mobile: at `max-width: $bp-tablet` hide "Pomodoro" text in trigger, dropdown full-width

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd angular-without-ssr && npx ng test --include="**/pomodoro-timer*" --watch=false`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/shared/components/pomodoro-timer/
git commit -m "feat: add PomodoroTimerComponent with navbar widget and focus reminder"
```

### Task 5: Integrate PomodoroTimerComponent into Navbar

**Files:**
- Modify: `angular-without-ssr/src/app/shared/components/auth-navbar.component.ts:9,82-84`

- [ ] **Step 1: Add import and render**

In `auth-navbar.component.ts`:

Line 3, add import:
```typescript
import { PomodoroTimerComponent } from './pomodoro-timer/pomodoro-timer.component';
```

Line 9, add to imports array:
```typescript
imports: [RouterModule, UserMenuComponent, PomodoroTimerComponent],
```

Line 82-84, in `.navbar__right` div, add before `<app-user-menu>`:
```html
<app-pomodoro-timer></app-pomodoro-timer>
```

- [ ] **Step 2: Verify app compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add angular-without-ssr/src/app/shared/components/auth-navbar.component.ts
git commit -m "feat: integrate Pomodoro timer widget into navbar"
```

---

## Chunk 4: Settings Page

### Task 6: SettingsPageComponent

**Files:**
- Create: `angular-without-ssr/src/app/components/settings/settings.component.ts`
- Create: `angular-without-ssr/src/app/components/settings/settings.component.scss`
- Create: `angular-without-ssr/src/app/components/settings/settings.component.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// settings.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { of } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockPrefsService: jasmine.SpyObj<UserPreferencesService>;

  const mockPrefs = {
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true
  };

  beforeEach(() => {
    mockPrefsService = jasmine.createSpyObj('UserPreferencesService', ['getPreferences', 'updatePreferences']);
    mockPrefsService.getPreferences.and.returnValue(of(mockPrefs as any));
    mockPrefsService.updatePreferences.and.returnValue(of(mockPrefs as any));

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: UserPreferencesService, useValue: mockPrefsService }
      ]
    });
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load preferences on init', () => {
    fixture.detectChanges();
    expect(mockPrefsService.getPreferences).toHaveBeenCalled();
    expect(component.workDurationSignal()).toBe(25);
    expect(component.breakDurationSignal()).toBe(5);
  });

  it('should validate work duration bounds (1-120)', () => {
    fixture.detectChanges();
    component.workDurationSignal.set(0);
    component.save();
    // Should clamp to minimum 1
    expect(component.workDurationSignal()).toBe(1);
  });

  it('should save preferences', () => {
    fixture.detectChanges();
    component.workDurationSignal.set(30);
    component.save();
    expect(mockPrefsService.updatePreferences).toHaveBeenCalledWith(
      jasmine.objectContaining({ pomodoro_work_duration: 30 })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd angular-without-ssr && npx ng test --include="**/settings*" --watch=false`
Expected: FAIL — component not found

- [ ] **Step 3: Implement SettingsComponent**

Create `settings.component.ts` with inline template:
- Heading "Ustawienia" with subtitle
- Pomodoro section card with:
  - 🍅 icon + "Pomodoro" heading
  - 3-column grid (responsive): work duration, break duration, long break duration — use `<input type="number">` with min/max attributes
  - Sessions before long break: number input
  - Toggles section (border-top): sound enabled, notifications enabled — use custom toggle or PrimeNG ToggleSwitch
- Signals: `workDurationSignal`, `breakDurationSignal`, `longBreakDurationSignal`, `sessionsBeforeLongBreakSignal`, `soundEnabledSignal`, `notificationsEnabledSignal`, `isSavingSignal`, `savedSignal`
- Methods: `save()` — validates bounds (clamp), calls `updatePreferences()`, then calls `pomodoroService.reloadSettings()` to pick up new durations, shows "Zapisano" feedback
- Inject: `UserPreferencesService`, `PomodoroService`
- OnPush, standalone
- OnInit: loads preferences

- [ ] **Step 4: Implement SCSS**

Create `settings.component.scss` with BEM classes using `@use 'variables' as *`:
- `.settings` — page wrapper with `$page-padding`, `$page-max-width`
- `.settings__card` — white card with border, radius-xl, shadow
- `.settings__grid` — 3-col grid, 1-col on `$bp-tablet`
- `.settings__input` — styled number input matching existing form styles
- `.settings__toggle-row` — flex between label+description and toggle
- `.settings__save-btn` — primary button at bottom
- `.settings__saved` — green success text that fades

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd angular-without-ssr && npx ng test --include="**/settings*" --watch=false`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/components/settings/
git commit -m "feat: add Settings page with Pomodoro configuration"
```

### Task 7: Add /settings Route and Navigation Link

**Files:**
- Modify: `angular-without-ssr/src/app/app.routes.ts`
- Modify: `angular-without-ssr/src/app/auth/components/user-menu.component.html:19-26`
- Modify: `angular-without-ssr/src/app/auth/components/user-menu.component.ts:11`

- [ ] **Step 1: Add route to app.routes.ts**

Add after the `/share/:token` route (before public routes):

```typescript
{
  path: 'settings',
  loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent),
  canActivate: [authGuard]
},
```

- [ ] **Step 2: Add "Ustawienia" link to user menu**

In `user-menu.component.ts` line 11, ensure `RouterModule` is in imports (it's already there).

In `user-menu.component.html`, after the `dropdown-header` div (line 26) and before the `dropdown-footer` div (line 27), add:

```html
<div class="dropdown-body">
  <a routerLink="/settings" class="dropdown-item" (click)="closeMenu()">
    <i class="pi pi-cog"></i>
    Ustawienia
  </a>
</div>
```

- [ ] **Step 3: Add dropdown-body styles to user-menu.component.scss**

After `.dropdown-header` styles (after line 134), add:

```scss
.dropdown-body {
  padding: 0.375rem 0;
  border-bottom: 1px solid #f0f1f5;
}
```

- [ ] **Step 4: Verify app compiles and route works**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/app.routes.ts angular-without-ssr/src/app/auth/components/user-menu.component.html angular-without-ssr/src/app/auth/components/user-menu.component.ts angular-without-ssr/src/app/auth/components/user-menu.component.scss
git commit -m "feat: add /settings route and Ustawienia link in user menu"
```

### Task 8: Integrate Timer Badge into Bottom Nav (Mobile)

**Files:**
- Modify: `angular-without-ssr/src/app/shared/components/bottom-nav/bottom-nav.component.ts`
- Modify: `angular-without-ssr/src/app/shared/components/bottom-nav/bottom-nav.component.scss`

- [ ] **Step 1: Add PomodoroService import and compact timer to bottom nav**

In `bottom-nav.component.ts`:
- Import `PomodoroService`
- Add `pomodoroService = inject(PomodoroService)`
- In template, add a compact timer badge above the bottom nav (or as a floating element) that shows only when `pomodoroService.isRunning()`:

```html
@if (pomodoroService.isRunning()) {
  <div class="bottom-nav__pomodoro"
       [class.bottom-nav__pomodoro--work]="pomodoroService.phase() === 'work'"
       [class.bottom-nav__pomodoro--break]="pomodoroService.phase() !== 'work'">
    {{ formatTime(pomodoroService.timeRemaining()) }}
  </div>
}
```

Add `formatTime()` method (same logic as PomodoroTimerComponent).

- [ ] **Step 2: Add styles for compact timer badge**

In `bottom-nav.component.scss`, add:

```scss
.bottom-nav__pomodoro {
  position: absolute;
  top: -1.75rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.15rem 0.6rem;
  border-radius: $radius-pill;
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  z-index: 51;
}

.bottom-nav__pomodoro--work {
  background: $color-success-light;
  color: $color-success;
  border: 1px solid $color-success;
}

.bottom-nav__pomodoro--break {
  background: $color-primary-light;
  color: $color-primary;
  border: 1px solid $color-primary;
}
```

- [ ] **Step 3: Verify on mobile viewport**

Run: `cd angular-without-ssr && npx ng serve`
Open Chrome DevTools → mobile viewport → verify compact badge appears above bottom nav when timer is running

- [ ] **Step 4: Commit**

```bash
git add angular-without-ssr/src/app/shared/components/bottom-nav/
git commit -m "feat: add compact Pomodoro timer badge to mobile bottom nav"
```

---

## Chunk 5: Audio Asset and Final Integration

### Task 9: Add Audio Asset

**Files:**
- Create: `angular-without-ssr/src/assets/sounds/pomodoro-bell.mp3`

- [ ] **Step 1: Create sounds directory and add bell sound**

Create directory `angular-without-ssr/src/assets/sounds/`.

For the bell sound, generate a simple notification tone or download a free CC0 bell sound. A minimal approach: use a very short (1-2 second) bell/chime MP3 file.

Note: If no suitable free sound is available, use the Web Audio API to generate a synthetic bell tone in PomodoroService instead (oscillator-based, no file needed). This is a valid alternative.

- [ ] **Step 2: Verify the asset is served**

Run: `cd angular-without-ssr && npx ng serve` and navigate to `http://localhost:4200/assets/sounds/pomodoro-bell.mp3`
Expected: File is served (or if using synthetic audio, skip this step)

- [ ] **Step 3: Commit**

```bash
git add angular-without-ssr/src/assets/sounds/
git commit -m "feat: add Pomodoro notification bell sound"
```

### Task 10: Final Integration Test

- [ ] **Step 1: Run full test suite**

Run: `cd angular-without-ssr && npx ng test --watch=false`
Expected: All tests PASS, no regressions

- [ ] **Step 2: Manual smoke test**

Run: `cd angular-without-ssr && npx ng serve`

Verify:
1. Login → navbar shows "🍅 Pomodoro" button
2. Click button → dropdown opens with Start button
3. Click Start → focus reminder dialog appears (first time)
4. Click "Zaczynamy!" → timer starts, badge turns green with countdown
5. Timer counts down correctly (test with short duration in settings)
6. Pause/resume/skip/reset all work
7. Go to user menu → "Ustawienia" link visible
8. Navigate to /settings → Pomodoro section with correct defaults
9. Change work duration to 1 min, save → timer uses new duration
10. Refresh page → timer restores from localStorage
11. Mobile viewport → compact badge, bottom-sheet dropdown

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address integration issues from smoke testing"
```
