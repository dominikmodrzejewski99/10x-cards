import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { SetsFacadeService } from '../../services/facades/sets-facade.service';
import { ShareService } from '../../services/api/share.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { SetCardComponent } from './set-card.component';
import { SetFormDialogComponent } from './set-form-dialog.component';
import { SetFormData } from '../../shared/models';
import { FlashcardSetDTO } from '../../../types';

@Component({
  selector: 'app-set-list',
  imports: [
    NgxSkeletonLoaderModule,
    TranslocoDirective,
    SetCardComponent,
    SetFormDialogComponent,
  ],
  templateUrl: './set-list.component.html',
  styleUrls: ['./set-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetListComponent implements OnInit {
  public readonly facade: SetsFacadeService = inject(SetsFacadeService);
  private readonly shareService: ShareService = inject(ShareService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly t: TranslocoService = inject(TranslocoService);

  public dialogVisibleSignal: boolean = false;
  public editingSetSignal: FlashcardSetDTO | null = null;

  public ngOnInit(): void {
    this.facade.loadSets();

    const shouldCreate: string | null = this.route.snapshot.queryParams['create'];
    if (shouldCreate) {
      this.openCreateDialog();
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  public openCreateDialog(): void {
    this.editingSetSignal = null;
    this.dialogVisibleSignal = true;
  }

  public openEditDialog(set: FlashcardSetDTO): void {
    this.editingSetSignal = set;
    this.dialogVisibleSignal = true;
  }

  public closeDialog(): void {
    this.dialogVisibleSignal = false;
    this.editingSetSignal = null;
  }

  public onSave(data: SetFormData): void {
    const editing: FlashcardSetDTO | null = this.editingSetSignal;
    if (editing) {
      this.facade.updateSet(editing.id, data);
    } else {
      this.facade.createSet(data);
    }
    this.closeDialog();
  }

  public async onDelete(set: FlashcardSetDTO): Promise<void> {
    const confirmed: boolean = await this.confirmService.confirm({
      message: this.t.translate('sets.toasts.confirmDeleteMessage', { name: set.name }),
      header: this.t.translate('sets.toasts.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t.translate('toasts.yes'),
      rejectLabel: this.t.translate('toasts.no'),
      acceptClass: 'danger',
    });
    if (confirmed) {
      this.facade.deleteSet(set.id);
    }
  }

  public async onShare(set: FlashcardSetDTO): Promise<void> {
    try {
      const link = await this.shareService.createShareLink(set.id);
      const url: string = this.shareService.buildShareUrl(link.id);
      await navigator.clipboard.writeText(url);
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.copied'),
        detail: this.t.translate('sets.toasts.shareLinkCopied'),
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('sets.toasts.linkGenerationFailed'),
      });
    }
  }

  public async onPublish(set: FlashcardSetDTO): Promise<void> {
    const confirmed: boolean = await this.confirmService.confirm({
      message: this.t.translate('sets.toasts.confirmPublishMessage', { name: set.name }),
      header: this.t.translate('sets.toasts.confirmPublishHeader'),
      icon: 'pi pi-globe',
      acceptLabel: this.t.translate('toasts.publish'),
      rejectLabel: this.t.translate('toasts.cancel'),
    });
    if (confirmed) {
      this.facade.publishSet(set.id);
    }
  }

  public async onUnpublish(set: FlashcardSetDTO): Promise<void> {
    const confirmed: boolean = await this.confirmService.confirm({
      message: this.t.translate('sets.toasts.confirmUnpublishMessage', { name: set.name }),
      header: this.t.translate('sets.toasts.confirmUnpublishHeader'),
      icon: 'pi pi-lock',
      acceptLabel: this.t.translate('sets.toasts.hide'),
      rejectLabel: this.t.translate('toasts.cancel'),
    });
    if (confirmed) {
      this.facade.unpublishSet(set.id);
    }
  }

  public navigateToSet(set: FlashcardSetDTO): void {
    this.router.navigate(['/sets', set.id]);
  }

  public studySet(set: FlashcardSetDTO): void {
    this.router.navigate(['/study'], { queryParams: { setId: set.id } });
  }

  public quizSet(set: FlashcardSetDTO): void {
    this.router.navigate(['/quiz', set.id]);
  }
}
