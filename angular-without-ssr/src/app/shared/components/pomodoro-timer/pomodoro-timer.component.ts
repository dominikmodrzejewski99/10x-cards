import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  WritableSignal,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewContainerRef,
  viewChild,
  TemplateRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DialogComponent } from '../dialog/dialog.component';
import { PomodoroService } from '../../../services/pomodoro.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';

@Component({
  selector: 'app-pomodoro-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, FormsModule, OverlayModule],
  template: `
    <div class="pomodoro" #triggerEl>
      <!-- Inactive state: trigger button -->
      @if (!pomodoroService.isRunning() && pomodoroService.timeRemaining() === 0) {
        <button class="pomodoro-trigger" (click)="toggleDropdown()">
          <span class="pomodoro-trigger__icon">\uD83C\uDF45</span>
          <span class="pomodoro-trigger__text">Pomodoro</span>
        </button>
      }

      <!-- Active work state: green badge -->
      @if ((pomodoroService.isRunning() || pomodoroService.timeRemaining() > 0) && pomodoroService.phase() === 'work') {
        <button
          class="pomodoro-badge pomodoro-badge--work"
          (click)="toggleDropdown()">
          {{ formatTime(pomodoroService.timeRemaining()) }}
          <span class="pomodoro-badge__session">{{ pomodoroService.sessionsCompleted() + 1 }}/{{ sessionsBeforeLongBreakSignal() }}</span>
        </button>
      }

      <!-- Break state: blue badge -->
      @if ((pomodoroService.isRunning() || pomodoroService.timeRemaining() > 0) && (pomodoroService.phase() === 'break' || pomodoroService.phase() === 'longBreak')) {
        <button
          class="pomodoro-badge pomodoro-badge--break"
          (click)="toggleDropdown()">
          \u2615 przerwa
        </button>
      }
    </div>

    <!-- Dropdown rendered via CDK Overlay -->
    <ng-template #dropdownTpl>
      <div class="pomodoro-dropdown">
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

          <div class="pomodoro-dropdown__dots">
            @for (dot of sessionsArray(); track $index) {
              <span
                class="pomodoro-dropdown__dot"
                [class.pomodoro-dropdown__dot--filled]="$index < pomodoroService.sessionsCompleted()">
              </span>
            }
          </div>

          <button class="pomodoro-dropdown__end" (click)="onReset()">
            Zako\u0144cz sesj\u0119
          </button>
        } @else {
          <button class="pomodoro-dropdown__start-btn" (click)="onStart()">
            Start
          </button>
        }
      </div>
    </ng-template>

    <!-- Focus Reminder Dialog -->
    <app-dialog
      header="\uD83C\uDFAF Tryb skupienia"
      [visible]="showFocusReminderSignal()"
      (visibleChange)="showFocusReminderSignal.set(false)"
      [maxWidth]="'420px'">
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
    </app-dialog>
  `,
  styles: [`
    .pomodoro-trigger {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.85rem;
      background: var(--app-white); border: 1.5px solid var(--app-border); border-radius: 9999px;
      cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 600;
      color: var(--app-text); transition: all 0.15s ease;
    }
    .pomodoro-trigger:hover { border-color: var(--app-primary); background: var(--app-primary-light); }
    .pomodoro-badge {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.75rem;
      border-radius: 9999px; font-family: inherit; font-size: 0.8rem; font-weight: 700;
      font-variant-numeric: tabular-nums; cursor: pointer; transition: all 0.15s ease;
    }
    .pomodoro-badge--work { background: var(--app-success-light); color: var(--app-success); border: 1.5px solid var(--app-success); }
    .pomodoro-badge--break { background: var(--app-primary-light); color: var(--app-primary); border: 1.5px solid var(--app-primary); }
    .pomodoro-badge__session { font-weight: 500; font-size: 0.75rem; opacity: 0.8; }
    .focus-reminder { display: flex; flex-direction: column; gap: 0.75rem; }
    .focus-reminder__text { font-size: 0.9rem; color: var(--app-text); line-height: 1.5; margin: 0; }
    .focus-reminder__list { font-size: 0.85rem; color: var(--app-text-secondary); line-height: 1.7; margin: 0; padding-left: 1.25rem; }
    .focus-reminder__checkbox {
      display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;
      color: var(--app-text-secondary); cursor: pointer;
    }
    .focus-reminder__checkbox input[type='checkbox'] { width: 1rem; height: 1rem; cursor: pointer; }
    .focus-reminder__btn {
      width: 100%; padding: 0.65rem 1rem; background: var(--app-primary); color: #fff;
      border: none; border-radius: 0.5rem; font-family: inherit; font-size: 0.9rem;
      font-weight: 600; cursor: pointer; transition: all 0.15s ease; margin-top: 0.25rem;
    }
    .focus-reminder__btn:hover { background: var(--app-primary-hover); box-shadow: 0 2px 12px rgba(66,85,255,0.25); }
    @media (max-width: 640px) { .pomodoro-trigger__text { display: none; } }
    @media (max-width: 992px) {
      .pomodoro-trigger { padding: 0.3rem 0.55rem; font-size: 0.8rem; }
      .pomodoro-badge { padding: 0.25rem 0.55rem; font-size: 0.75rem; }
    }
  `]
})
export class PomodoroTimerComponent implements OnInit, OnDestroy {
  public readonly pomodoroService = inject(PomodoroService);
  private readonly prefsService = inject(UserPreferencesService);
  private readonly overlay = inject(Overlay);
  private readonly vcr = inject(ViewContainerRef);

  private readonly triggerEl = viewChild.required<ElementRef>('triggerEl');
  private readonly dropdownTpl = viewChild.required<TemplateRef<unknown>>('dropdownTpl');

  public isDropdownOpenSignal: WritableSignal<boolean> = signal(false);
  public showFocusReminderSignal: WritableSignal<boolean> = signal(false);
  public focusReminderDismissedSignal: WritableSignal<boolean> = signal(false);
  public dontShowAgainSignal: WritableSignal<boolean> = signal(false);
  public sessionsBeforeLongBreakSignal: WritableSignal<number> = signal(4);

  public dontShowAgainChecked = false;

  private overlayRef: OverlayRef | null = null;

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

  ngOnDestroy(): void {
    this.closeDropdown();
  }

  public toggleDropdown(): void {
    if (this.overlayRef) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  public closeDropdown(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    this.isDropdownOpenSignal.set(false);
  }

  private openDropdown(): void {
    if (this.overlayRef) return;

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.triggerEl())
      .withPositions([
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
      ])
      .withFlexibleDimensions(false)
      .withPush(true);

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'pomodoro-dropdown-backdrop',
      panelClass: 'pomodoro-dropdown-panel',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const portal = new TemplatePortal(this.dropdownTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef.backdropClick().subscribe(() => this.closeDropdown());
    this.overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') this.closeDropdown();
    });

    this.isDropdownOpenSignal.set(true);
  }

  public onStart(): void {
    if (!this.focusReminderDismissedSignal()) {
      this.closeDropdown();
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
}
