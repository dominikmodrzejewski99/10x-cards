import { Component, ChangeDetectionStrategy, inject, signal, computed, WritableSignal, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { UserDTO } from '../../../types';
import { AuthStore } from '../store';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  private authStore = inject(AuthStore);
  private confirmationService = inject(ConfirmationService);

  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public userSignal: Signal<UserDTO | null> = this.authStore.user;
  public isMenuOpenSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly userInitialsSignal: Signal<string> = computed<string>(() => {
    const u: UserDTO | null = this.userSignal();
    if (!u?.email) return '?';
    return u.email.charAt(0).toUpperCase();
  });

  public toggleMenu(): void {
    this.isMenuOpenSignal.update((v: boolean) => !v);
  }

  public closeMenu(): void {
    this.isMenuOpenSignal.set(false);
  }

  public onEscape(): void {
    if (this.isMenuOpenSignal()) this.closeMenu();
  }

  public onDeleteAccount(): void {
    this.closeMenu();
    this.confirmationService.confirm({
      header: 'Usuwanie konta',
      message: 'Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna — wszystkie fiszki, zestawy i historia nauki zostaną trwale usunięte.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Usuń konto',
      rejectLabel: 'Anuluj',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.authStore.deleteAccount();
      }
    });
  }

  public onLogout(): void {
    this.closeMenu();
    this.authStore.logout();
  }
}
