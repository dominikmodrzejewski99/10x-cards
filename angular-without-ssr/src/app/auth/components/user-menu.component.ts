import { Component, ChangeDetectionStrategy, inject, signal, computed, WritableSignal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { UserDTO } from '../../../types';
import { AuthStore } from '../store';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, FormsModule, DialogComponent, TranslocoDirective],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent {
  private authStore = inject(AuthStore);
  private transloco = inject(TranslocoService);

  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public userSignal: Signal<UserDTO | null> = this.authStore.user;
  public isMenuOpenSignal: WritableSignal<boolean> = signal<boolean>(false);
  public isDeleteDialogVisibleSignal: WritableSignal<boolean> = signal<boolean>(false);
  public deleteConfirmText: string = '';

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
    this.deleteConfirmText = '';
    this.isDeleteDialogVisibleSignal.set(true);
  }

  public confirmDeleteAccount(): void {
    const expected: string = this.transloco.translate('auth.userMenu.deleteConfirmWord');
    if (this.deleteConfirmText.trim().toUpperCase() !== expected.toUpperCase()) return;
    this.isDeleteDialogVisibleSignal.set(false);
    this.authStore.deleteAccount();
  }

  public cancelDeleteAccount(): void {
    this.isDeleteDialogVisibleSignal.set(false);
    this.deleteConfirmText = '';
  }

  public onLogout(): void {
    this.closeMenu();
    this.authStore.logout();
  }
}
