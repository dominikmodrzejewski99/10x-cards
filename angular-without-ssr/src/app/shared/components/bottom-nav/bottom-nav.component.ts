import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../../../auth/store';
import { PomodoroService } from '../../../services/pomodoro.service';

@Component({
  selector: 'app-bottom-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  template: `
    @if (authCheckedSignal() && isAuthenticatedSignal()) {
      @if (pomodoroService.isRunning()) {
        <div class="bottom-nav__pomodoro"
             [class.bottom-nav__pomodoro--work]="pomodoroService.phase() === 'work'"
             [class.bottom-nav__pomodoro--break]="pomodoroService.phase() !== 'work'">
          {{ formatTime(pomodoroService.timeRemaining()) }}
        </div>
      }
      <nav class="bottom-nav" aria-label="Nawigacja mobilna">
        <a routerLink="/dashboard" routerLinkActive="bottom-nav__item--active"
           [routerLinkActiveOptions]="{exact: true}" class="bottom-nav__item">
          <i class="pi pi-home bottom-nav__icon"></i>
          <span class="bottom-nav__label">Start</span>
        </a>
        <a routerLink="/generate" routerLinkActive="bottom-nav__item--active" class="bottom-nav__item">
          <i class="pi pi-microchip-ai bottom-nav__icon"></i>
          <span class="bottom-nav__label">Generuj</span>
        </a>
        <a routerLink="/study" routerLinkActive="bottom-nav__item--active" class="bottom-nav__item bottom-nav__item--study">
          <span class="bottom-nav__study-ring">
            <i class="pi pi-book bottom-nav__icon"></i>
          </span>
          <span class="bottom-nav__label">Nauka</span>
        </a>
        <a routerLink="/sets" routerLinkActive="bottom-nav__item--active" class="bottom-nav__item">
          <i class="pi pi-folder bottom-nav__icon"></i>
          <span class="bottom-nav__label">Zestawy</span>
        </a>
        <a routerLink="/quiz" routerLinkActive="bottom-nav__item--active" class="bottom-nav__item">
          <i class="pi pi-file-edit bottom-nav__icon"></i>
          <span class="bottom-nav__label">Quiz</span>
        </a>
      </nav>
    }
  `,
  styleUrl: './bottom-nav.component.scss'
})
export class BottomNavComponent {
  private authStore = inject(AuthStore);

  public authCheckedSignal: Signal<boolean> = this.authStore.authChecked;
  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public pomodoroService = inject(PomodoroService);

  public formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
