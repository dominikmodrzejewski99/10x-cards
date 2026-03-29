import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  WritableSignal,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PomodoroService } from '../../../services/pomodoro.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';

@Component({
  selector: 'app-pomodoro-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, FormsModule],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <div class="pomodoro">
      <!-- Inactive state: trigger button -->
      @if (!pomodoroService.isRunning() && pomodoroService.timeRemaining() === 0) {
        <button class="pomodoro-trigger" (click)="toggleDropdown(); $event.stopPropagation()">
          <span class="pomodoro-trigger__icon">\uD83C\uDF45</span>
          <span class="pomodoro-trigger__text">Pomodoro</span>
        </button>
      }

      <!-- Active work state: green badge -->
      @if ((pomodoroService.isRunning() || pomodoroService.timeRemaining() > 0) && pomodoroService.phase() === 'work') {
        <button
          class="pomodoro-badge pomodoro-badge--work"
          (click)="toggleDropdown(); $event.stopPropagation()">
          {{ formatTime(pomodoroService.timeRemaining()) }}
          <span class="pomodoro-badge__session">{{ pomodoroService.sessionsCompleted() + 1 }}/{{ sessionsBeforeLongBreakSignal() }}</span>
        </button>
      }

      <!-- Break state: blue badge -->
      @if ((pomodoroService.isRunning() || pomodoroService.timeRemaining() > 0) && (pomodoroService.phase() === 'break' || pomodoroService.phase() === 'longBreak')) {
        <button
          class="pomodoro-badge pomodoro-badge--break"
          (click)="toggleDropdown(); $event.stopPropagation()">
          \u2615 przerwa
        </button>
      }

      <!-- Dropdown panel -->
      @if (isDropdownOpenSignal()) {
        <div class="pomodoro-backdrop" (click)="closeDropdown()"></div>
        <div class="pomodoro-dropdown" (click)="$event.stopPropagation()">
          <div class="pomodoro-dropdown__timer">
            {{ formatTime(pomodoroService.timeRemaining() || getDefaultDuration()) }}
          </div>
          <div class="pomodoro-dropdown__phase">
            @switch (pomodoroService.phase()) {
              @case ('work') { Sesja nauki }
              @case ('break') { Przerwa }
              @case ('longBreak') { D\u0142uga przerwa }
            }
          </div>

          @if (pomodoroService.isRunning() || pomodoroService.timeRemaining() > 0) {
            <!-- Controls: play/pause, reset, skip -->
            <div class="pomodoro-dropdown__controls">
              @if (pomodoroService.isRunning()) {
                <button class="pomodoro-dropdown__control-btn" (click)="onPause()" title="Pauza">
                  \u23F8
                </button>
              } @else {
                <button class="pomodoro-dropdown__control-btn" (click)="onResume()" title="Wzn\u00f3w">
                  \u25B6
                </button>
              }
              <button class="pomodoro-dropdown__control-btn" (click)="onReset()" title="Reset">
                \u21BA
              </button>
              <button class="pomodoro-dropdown__control-btn" (click)="onSkip()" title="Pomi\u0144">
                \u23ED
              </button>
            </div>

            <!-- Session progress dots -->
            <div class="pomodoro-dropdown__dots">
              @for (dot of sessionsArray(); track $index) {
                <span
                  class="pomodoro-dropdown__dot"
                  [class.pomodoro-dropdown__dot--filled]="$index < pomodoroService.sessionsCompleted()">
                </span>
              }
            </div>

            <!-- End session link -->
            <button class="pomodoro-dropdown__end" (click)="onReset()">
              Zako\u0144cz sesj\u0119
            </button>
          } @else {
            <!-- Start button -->
            <button class="pomodoro-dropdown__start-btn" (click)="onStart()">
              Start
            </button>
          }
        </div>
      }
    </div>

    <!-- Focus Reminder Dialog -->
    <p-dialog
      header="\uD83C\uDFAF Tryb skupienia"
      [visible]="showFocusReminderSignal()"
      (visibleChange)="showFocusReminderSignal.set(false)"
      [modal]="true"
      [closeOnEscape]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{width: '95vw', maxWidth: '420px'}"
      styleClass="modern-dialog">
      <div class="focus-reminder">
        <p class="focus-reminder__text">
          Aby w pe\u0142ni wykorzysta\u0107 czas nauki, w\u0142\u0105cz tryb "Nie przeszkadza\u0107":
        </p>
        <ul class="focus-reminder__list">
          <li><strong>Windows:</strong> Focus Assist (Ustawienia \u2192 System \u2192 Pomoc w koncentracji)</li>
          <li><strong>macOS:</strong> Focus (Centrum sterowania \u2192 Skupienie)</li>
          <li><strong>Telefon:</strong> W\u0142\u0105cz tryb "Nie przeszkadza\u0107"</li>
        </ul>
        <label class="focus-reminder__checkbox">
          <input type="checkbox" [(ngModel)]="dontShowAgainChecked" />
          Nie pokazuj ponownie
        </label>
        <button class="focus-reminder__btn" (click)="onStartConfirmed()">
          Zaczynamy!
        </button>
      </div>
    </p-dialog>
  `,
  styles: [`
    .pomodoro { position: relative; }
    .pomodoro-trigger {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.85rem;
      background: #fff; border: 1.5px solid #d9dbe9; border-radius: 9999px;
      cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 600;
      color: #282e3e; transition: all 0.15s ease;
    }
    .pomodoro-trigger:hover { border-color: #4255ff; background: #edefff; }
    .pomodoro-badge {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem;
      border-radius: 9999px; font-family: inherit; font-size: 0.8rem; font-weight: 700;
      font-variant-numeric: tabular-nums; cursor: pointer; transition: all 0.15s ease;
    }
    .pomodoro-badge--work { background: #e8f8f0; color: #23b26d; border: 1.5px solid #23b26d; }
    .pomodoro-badge--break { background: #edefff; color: #4255ff; border: 1.5px solid #4255ff; }
    .pomodoro-badge__session { font-weight: 500; font-size: 0.75rem; opacity: 0.8; }
    .pomodoro-backdrop { position: fixed; inset: 0; z-index: 50; }
    .pomodoro-dropdown {
      position: absolute; top: calc(100% + 0.5rem); right: 0; width: 280px;
      background: #fff; border-radius: 1rem; border: 1px solid #d9dbe9;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 51; padding: 1.25rem;
      display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
      animation: dropdown-enter 0.18s ease-out;
    }
    @keyframes dropdown-enter {
      from { opacity: 0; transform: translateY(-6px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .pomodoro-dropdown__timer {
      font-size: 2.5rem; font-weight: 700; font-variant-numeric: tabular-nums;
      text-align: center; color: #282e3e; line-height: 1;
    }
    .pomodoro-dropdown__phase {
      font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: #586380; text-align: center;
    }
    .pomodoro-dropdown__controls { display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .pomodoro-dropdown__control-btn {
      display: flex; align-items: center; justify-content: center;
      width: 2.5rem; height: 2.5rem; border-radius: 50%; background: #f6f7fb;
      border: none; cursor: pointer; font-size: 1.1rem; color: #282e3e; transition: all 0.15s ease;
    }
    .pomodoro-dropdown__control-btn:hover { background: #edefff; color: #4255ff; }
    .pomodoro-dropdown__dots { display: flex; align-items: center; justify-content: center; gap: 0.35rem; }
    .pomodoro-dropdown__dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #d9dbe9; transition: background 0.2s ease; }
    .pomodoro-dropdown__dot--filled { background: #23b26d; }
    .pomodoro-dropdown__end {
      font-size: 0.75rem; color: #586380; background: none; border: none;
      cursor: pointer; font-family: inherit; text-decoration: underline;
      text-underline-offset: 2px; transition: all 0.15s ease;
    }
    .pomodoro-dropdown__end:hover { color: #ff6240; }
    .pomodoro-dropdown__start-btn {
      width: 100%; padding: 0.65rem 1rem; background: #4255ff; color: #fff;
      border: none; border-radius: 0.5rem; font-family: inherit; font-size: 0.9rem;
      font-weight: 600; cursor: pointer; transition: all 0.15s ease;
    }
    .pomodoro-dropdown__start-btn:hover { background: #3b4ce3; box-shadow: 0 2px 12px rgba(66,85,255,0.25); }
    .focus-reminder { display: flex; flex-direction: column; gap: 0.75rem; }
    .focus-reminder__text { font-size: 0.9rem; color: #282e3e; line-height: 1.5; margin: 0; }
    .focus-reminder__list { font-size: 0.85rem; color: #586380; line-height: 1.7; margin: 0; padding-left: 1.25rem; }
    .focus-reminder__checkbox {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;
      color: #586380; cursor: pointer;
    }
    .focus-reminder__checkbox input[type='checkbox'] { width: 1rem; height: 1rem; cursor: pointer; }
    .focus-reminder__btn {
      width: 100%; padding: 0.65rem 1rem; background: #4255ff; color: #fff;
      border: none; border-radius: 0.5rem; font-family: inherit; font-size: 0.9rem;
      font-weight: 600; cursor: pointer; transition: all 0.15s ease; margin-top: 0.25rem;
    }
    .focus-reminder__btn:hover { background: #3b4ce3; box-shadow: 0 2px 12px rgba(66,85,255,0.25); }
    @media (max-width: 640px) { .pomodoro-trigger__text { display: none; } }
    @media (max-width: 992px) {
      .pomodoro-dropdown {
        position: fixed;
        top: auto;
        bottom: 4.5rem;
        right: 0.75rem;
        left: 0.75rem;
        width: auto;
        animation: dropdown-enter-mobile 0.18s ease-out;
      }
      @keyframes dropdown-enter-mobile {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .pomodoro-trigger {
        padding: 0.3rem 0.55rem;
        font-size: 0.8rem;
      }
      .pomodoro-badge {
        padding: 0.25rem 0.55rem;
        font-size: 0.75rem;
      }
    }
  `]
})
export class PomodoroTimerComponent implements OnInit {
  public readonly pomodoroService = inject(PomodoroService);
  private readonly prefsService = inject(UserPreferencesService);

  public isDropdownOpenSignal: WritableSignal<boolean> = signal(false);
  public showFocusReminderSignal: WritableSignal<boolean> = signal(false);
  public focusReminderDismissedSignal: WritableSignal<boolean> = signal(false);
  public dontShowAgainSignal: WritableSignal<boolean> = signal(false);
  public sessionsBeforeLongBreakSignal: WritableSignal<number> = signal(4);

  public dontShowAgainChecked = false;

  public sessionsArray = () => Array.from({ length: this.sessionsBeforeLongBreakSignal() });

  ngOnInit(): void {
    this.pomodoroService.loadSettings().subscribe(() => {
      this.pomodoroService.restoreState();
    });

    this.prefsService.getPreferences().subscribe(prefs => {
      this.focusReminderDismissedSignal.set(prefs.pomodoro_focus_reminder_dismissed ?? false);
      this.sessionsBeforeLongBreakSignal.set(prefs.pomodoro_sessions_before_long_break ?? 4);
    });
  }

  public toggleDropdown(): void {
    this.isDropdownOpenSignal.update(v => !v);
  }

  public closeDropdown(): void {
    this.isDropdownOpenSignal.set(false);
  }

  public onStart(): void {
    if (!this.focusReminderDismissedSignal()) {
      this.showFocusReminderSignal.set(true);
    } else {
      this.pomodoroService.start();
      this.closeDropdown();
    }
  }

  public onStartConfirmed(): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    this.showFocusReminderSignal.set(false);

    if (this.dontShowAgainChecked) {
      this.focusReminderDismissedSignal.set(true);
      this.prefsService.updatePreferences({
        pomodoro_focus_reminder_dismissed: true
      }).subscribe();
    }

    this.pomodoroService.start();
    this.closeDropdown();
  }

  public onPause(): void {
    this.pomodoroService.pause();
  }

  public onResume(): void {
    this.pomodoroService.resume();
  }

  public onReset(): void {
    this.pomodoroService.reset();
    this.closeDropdown();
  }

  public onSkip(): void {
    this.pomodoroService.skip();
  }

  public formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  public getDefaultDuration(): number {
    return 25 * 60;
  }

  public onDocumentClick(_event: Event): void {
    this.closeDropdown();
  }
}
