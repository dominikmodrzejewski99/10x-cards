import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { SettingsFacadeService } from '../../services/settings-facade.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .settings { max-width: 800px; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
    .settings__title { font-size: 1.5rem; font-weight: 700; color: var(--app-text-heading); margin: 0 0 0.25rem; }
    .settings__subtitle { color: var(--app-text-secondary); font-size: 0.9rem; margin: 0 0 2rem; }
    .settings__card { background: var(--app-white); border: 1px solid var(--app-border); border-radius: 1rem; padding: 1.5rem; box-shadow: var(--app-card-shadow); }
    .settings__card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem; }
    .settings__card-icon { font-size: 1.25rem; }
    .settings__card-title { font-size: 1.125rem; font-weight: 700; color: var(--app-text-heading); margin: 0; }
    .settings__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .settings__field { display: flex; flex-direction: column; gap: 0.375rem; }
    .settings__field--narrow { max-width: 200px; margin-bottom: 1.25rem; }
    .settings__label { font-size: 0.8rem; color: var(--app-text-secondary); font-weight: 500; }
    .settings__input {
      padding: 0.6rem 0.75rem; border: 1.5px solid var(--app-border); border-radius: 0.5rem;
      font-size: 1rem; font-family: inherit; color: var(--app-text); background: var(--app-white);
      transition: border-color 0.15s; width: 100%; box-sizing: border-box;
    }
    .settings__input:focus { outline: none; border-color: var(--app-primary); box-shadow: 0 0 0 3px rgba(66,85,255,0.1); }
    .settings__input[type="number"] { -moz-appearance: textfield; }
    .settings__input[type="number"]::-webkit-outer-spin-button,
    .settings__input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .settings__toggles { border-top: 1px solid var(--app-border); padding-top: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .settings__toggle-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .settings__toggle-label { font-size: 0.9rem; font-weight: 500; color: var(--app-text); }
    .settings__toggle-desc { font-size: 0.8rem; color: var(--app-text-secondary); margin-top: 0.125rem; }
    .settings__switch { position: relative; display: inline-block; width: 2.75rem; height: 1.5rem; flex-shrink: 0; }
    .settings__switch input { opacity: 0; width: 0; height: 0; }
    .settings__switch-slider {
      position: absolute; cursor: pointer; inset: 0; background: var(--app-border);
      border-radius: 9999px; transition: all 0.15s ease;
    }
    .settings__switch-slider::before {
      content: ''; position: absolute; height: 1.125rem; width: 1.125rem;
      left: 0.1875rem; bottom: 0.1875rem; background: var(--app-bg); border-radius: 50%;
      transition: all 0.15s ease;
    }
    .settings__switch input:checked + .settings__switch-slider { background: var(--app-success); }
    .settings__switch input:checked + .settings__switch-slider::before { transform: translateX(1.25rem); }
    .settings__actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.5rem; }
    .settings__save-btn {
      padding: 0.6rem 1.5rem; background: var(--app-primary); color: #fff; border: none;
      border-radius: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer;
      font-family: inherit; transition: all 0.15s ease;
    }
    .settings__save-btn:hover:not(:disabled) { background: var(--app-primary-hover); box-shadow: 0 2px 12px rgba(66,85,255,0.25); }
    .settings__save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .settings__saved { color: var(--app-success); font-size: 0.85rem; font-weight: 500; animation: fade-in 0.2s ease; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .settings__card--theme { margin-top: 1.5rem; }
    .settings__card-icon--theme { color: var(--app-purple); }
    .settings__card-icon--lang { color: var(--app-teal, #10b981); }
    .settings__theme-options { display: flex; gap: 0.75rem; }
    .settings__lang-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .settings__theme-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.85rem 1rem; border: 1.5px solid var(--app-border); border-radius: 0.75rem;
      background: var(--app-white); color: var(--app-text-secondary); font-size: 0.9rem;
      font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s ease;
    }
    .settings__theme-btn:hover { border-color: var(--app-primary); color: var(--app-text); }
    .settings__theme-btn--active {
      border-color: var(--app-primary); background: var(--app-primary-light);
      color: var(--app-primary);
    }
    .settings__theme-btn i { font-size: 1.1rem; }
    @media (max-width: 640px) {
      .settings { padding: 1rem 0.75rem; }
      .settings__grid { grid-template-columns: 1fr; }
      .settings__lang-grid { grid-template-columns: repeat(2, 1fr); }
      .settings__card { padding: 1.25rem; }
    }
  `],
  template: `
    <ng-container *transloco="let t; prefix: 'settings'">
    <div class="settings">
      <h1 class="settings__title">{{ t('title') }}</h1>
      <p class="settings__subtitle">{{ t('subtitle') }}</p>

      <!-- Pomodoro Section -->
      <div class="settings__card">
        <div class="settings__card-header">
          <span class="settings__card-icon">🍅</span>
          <h2 class="settings__card-title">{{ t('pomodoro.title') }}</h2>
        </div>

        <!-- Duration inputs: 3-column grid -->
        <div class="settings__grid">
          <div class="settings__field">
            <label class="settings__label">{{ t('pomodoro.workDuration') }}</label>
            <input type="number" class="settings__input" [min]="1" [max]="120"
                   [ngModel]="facade.workDurationSignal()" (ngModelChange)="facade.setWorkDuration($event)">
          </div>
          <div class="settings__field">
            <label class="settings__label">{{ t('pomodoro.breakDuration') }}</label>
            <input type="number" class="settings__input" [min]="1" [max]="60"
                   [ngModel]="facade.breakDurationSignal()" (ngModelChange)="facade.setBreakDuration($event)">
          </div>
          <div class="settings__field">
            <label class="settings__label">{{ t('pomodoro.longBreakDuration') }}</label>
            <input type="number" class="settings__input" [min]="1" [max]="60"
                   [ngModel]="facade.longBreakDurationSignal()" (ngModelChange)="facade.setLongBreakDuration($event)">
          </div>
        </div>

        <!-- Sessions input -->
        <div class="settings__field settings__field--narrow">
          <label class="settings__label">{{ t('pomodoro.sessionsBeforeLongBreak') }}</label>
          <input type="number" class="settings__input" [min]="1" [max]="10"
                 [ngModel]="facade.sessionsBeforeLongBreakSignal()" (ngModelChange)="facade.setSessionsBeforeLongBreak($event)">
        </div>

        <!-- Toggles -->
        <div class="settings__toggles">
          <div class="settings__toggle-row">
            <div>
              <div class="settings__toggle-label">{{ t('pomodoro.sound') }}</div>
              <div class="settings__toggle-desc">{{ t('pomodoro.soundDesc') }}</div>
            </div>
            <label class="settings__switch">
              <input type="checkbox" [ngModel]="facade.soundEnabledSignal()" (ngModelChange)="facade.setSoundEnabled($event)">
              <span class="settings__switch-slider"></span>
            </label>
          </div>
          <div class="settings__toggle-row">
            <div>
              <div class="settings__toggle-label">{{ t('pomodoro.notifications') }}</div>
              <div class="settings__toggle-desc">{{ t('pomodoro.notificationsDesc') }}</div>
            </div>
            <label class="settings__switch">
              <input type="checkbox" [ngModel]="facade.notificationsEnabledSignal()" (ngModelChange)="facade.setNotificationsEnabled($event)">
              <span class="settings__switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Save button -->
        <div class="settings__actions">
          <button class="settings__save-btn" (click)="facade.save()" [disabled]="facade.isSavingSignal()">
            {{ facade.isSavingSignal() ? t('saving') : t('save') }}
          </button>
          @if (facade.savedSignal()) {
            <span class="settings__saved">✓ {{ t('saved') }}</span>
          }
        </div>
      </div>

      <!-- Theme Section -->
      <div class="settings__card settings__card--theme">
        <div class="settings__card-header">
          <i class="pi pi-palette settings__card-icon settings__card-icon--theme"></i>
          <h2 class="settings__card-title">{{ t('theme.title') }}</h2>
        </div>

        <div class="settings__theme-options">
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.themeSignal() === 'light'"
                  (click)="facade.setTheme('light')">
            <i class="pi pi-sun"></i>
            <span>{{ t('theme.light') }}</span>
          </button>
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.themeSignal() === 'dark'"
                  (click)="facade.setTheme('dark')">
            <i class="pi pi-moon"></i>
            <span>{{ t('theme.dark') }}</span>
          </button>
        </div>
      </div>

      <!-- Language Section -->
      <div class="settings__card settings__card--theme">
        <div class="settings__card-header">
          <i class="pi pi-globe settings__card-icon settings__card-icon--lang"></i>
          <h2 class="settings__card-title">{{ t('language.title') }}</h2>
        </div>

        <div class="settings__lang-grid">
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.languageSignal() === 'pl'"
                  (click)="facade.setLanguage('pl')">
            <span>Polski</span>
          </button>
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.languageSignal() === 'en'"
                  (click)="facade.setLanguage('en')">
            <span>English</span>
          </button>
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.languageSignal() === 'de'"
                  (click)="facade.setLanguage('de')">
            <span>Deutsch</span>
          </button>
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.languageSignal() === 'es'"
                  (click)="facade.setLanguage('es')">
            <span>Español</span>
          </button>
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.languageSignal() === 'fr'"
                  (click)="facade.setLanguage('fr')">
            <span>Français</span>
          </button>
          <button class="settings__theme-btn"
                  [class.settings__theme-btn--active]="facade.languageSignal() === 'uk'"
                  (click)="facade.setLanguage('uk')">
            <span>Українська</span>
          </button>
        </div>
      </div>
    </div>
    </ng-container>
  `
})
export class SettingsComponent implements OnInit {
  protected readonly facade: SettingsFacadeService = inject(SettingsFacadeService);

  ngOnInit(): void {
    this.facade.init();
  }
}
