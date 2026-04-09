import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Component, OnInit, OnDestroy, signal, inject, effect, Injector, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

import { FlashcardsFacadeService } from '../../services/flashcards-facade.service';
import { ShareService } from '../../services/share.service';
import { PrintTestConfig } from '../../services/print-test.service';
import { FlashcardTableComponent } from './flashcard-table/flashcard-table.component';
import { FlashcardFormComponent } from './flashcard-form/flashcard-form.component';
import { ImportModalComponent } from './import-modal/import-modal.component';
import { PrintTestConfigComponent } from './print-test-config/print-test-config.component';
import { FlashcardDTO } from '../../../types';
import { ShareToFriendDialogComponent } from '../friends/share-to-friend-dialog.component';

@Component({
  selector: 'app-flashcard-list',
  imports: [
    DialogComponent,
    SpinnerComponent,
    FlashcardTableComponent,
    FlashcardFormComponent,
    ImportModalComponent,
    PrintTestConfigComponent,
    ShareToFriendDialogComponent,
    RouterModule,
    TranslocoDirective
  ],
  templateUrl: './flashcard-list.component.html',
  styleUrls: ['./flashcard-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardListComponent implements OnInit, OnDestroy {
  public readonly facade: FlashcardsFacadeService = inject(FlashcardsFacadeService);
  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly router: Router = inject(Router);
  private readonly injector: Injector = inject(Injector);
  private readonly shareService: ShareService = inject(ShareService);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly routeParams = toSignal(inject(ActivatedRoute).params, { initialValue: {} as Record<string, string> });
  private readonly routeSnapshot = inject(ActivatedRoute).snapshot;

  public readonly moreMenuOpen = signal<boolean>(false);
  public readonly shareDialogVisible = signal<boolean>(false);
  public readonly printTestDialogVisible = signal<boolean>(false);
  public readonly shareToFriendVisible = signal<boolean>(false);

  public ngOnInit(): void {
    effect(() => {
      const setId: number = Number(this.routeParams()['id']);
      if (!setId) {
        this.router.navigate(['/sets']);
        return;
      }
      this.facade.initForSet(setId);
    }, { injector: this.injector });

    const saved: string | undefined = this.routeSnapshot.queryParams['saved'];
    if (saved) {
      this.facade.setSavedCount(Number(saved));
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }

    const shared: string | undefined = this.routeSnapshot.queryParams['shared'];
    if (shared) {
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.copied'),
        detail: this.t.translate('flashcards.toasts.setCopied'),
      });
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }

    effect(() => {
      if (this.facade.needsAuthRedirectSignal()) {
        this.router.navigate(['/sets']);
      }
    }, { injector: this.injector });
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  public goBackToSets(): void {
    this.router.navigate(['/sets']);
  }

  public async handleDelete(flashcard: FlashcardDTO): Promise<void> {
    const confirmed: boolean = await this.confirmService.confirm({
      message: this.t.translate('flashcards.toasts.confirmDeleteMessage', { front: flashcard.front }),
      header: this.t.translate('flashcards.toasts.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t.translate('toasts.yes'),
      rejectLabel: this.t.translate('toasts.no'),
      acceptClass: 'danger'
    });
    if (confirmed) {
      this.facade.deleteFlashcard(flashcard);
    }
  }

  public async handleBulkDelete(ids: number[]): Promise<void> {
    const confirmed: boolean = await this.confirmService.confirm({
      message: this.t.translate('flashcards.toasts.confirmBulkDeleteMessage', { count: ids.length }),
      header: this.t.translate('flashcards.toasts.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t.translate('toasts.yes'),
      rejectLabel: this.t.translate('toasts.no'),
      acceptClass: 'danger'
    });
    if (confirmed) {
      this.facade.bulkDeleteFlashcards(ids);
    }
  }

  public async openShareDialog(): Promise<void> {
    this.shareDialogVisible.set(true);
    this.facade.setShareLink(null);
    this.facade.setShareLoading(true);
    try {
      const setId: number = this.facade.setIdSignal();
      const link = await this.shareService.createShareLink(setId);
      this.facade.setShareLink(this.shareService.buildShareUrl(link.id));
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('flashcards.toasts.linkGenerationFailed'),
      });
      this.shareDialogVisible.set(false);
    }
  }

  public async copyShareLink(): Promise<void> {
    const link: string | null = this.facade.shareLinkSignal();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.copied'),
        detail: this.t.translate('flashcards.toasts.linkCopied'),
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('flashcards.toasts.linkCopyFailed'),
      });
    }
  }

  public openPrintTestDialog(): void {
    this.printTestDialogVisible.set(true);
  }

  public onPrintTest(config: PrintTestConfig): void {
    this.printTestDialogVisible.set(false);
    this.facade.printTest(config);
  }
}
