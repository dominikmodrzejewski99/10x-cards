import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../services/api/share.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-share-accept',
  standalone: true,
  imports: [SpinnerComponent, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-container *transloco="let t; prefix: 'share'">
    @if (loading()) {
      <div class="share-accept">
        <app-spinner />
        <p>{{ t('loading') }}</p>
      </div>
    } @else if (error()) {
      <div class="share-accept share-accept--error">
        <i class="pi pi-exclamation-triangle share-accept__icon"></i>
        <h2>{{ t('errorTitle') }}</h2>
        <p>{{ error() }}</p>
        <button class="share-accept__btn" (click)="goToDashboard()">{{ t('goToDashboard') }}</button>
      </div>
    }
  </ng-container>`,
  styles: [`
    .share-accept {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 1rem;
      text-align: center;
      padding: 2rem;
    }
    .share-accept__icon {
      font-size: 3rem;
      color: var(--red-500);
    }
  `],
})
export class ShareAcceptComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shareService = inject(ShareService);
  private readonly t = inject(TranslocoService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error.set(this.t.translate('share.invalidLink'));
      this.loading.set(false);
      return;
    }
    this.acceptLink(token);
  }

  private async acceptLink(token: string): Promise<void> {
    try {
      const newSetId = await this.shareService.acceptShareLink(token);
      this.router.navigate(['/sets', newSetId], { queryParams: { shared: 'true' } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('expired')) {
        this.error.set(this.t.translate('share.expired'));
      } else if (message.includes('not found')) {
        this.error.set(this.t.translate('share.notFound'));
      } else if (message.includes('no flashcards')) {
        this.error.set(this.t.translate('share.noFlashcards'));
      } else {
        this.error.set(this.t.translate('share.genericError'));
      }
      this.loading.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
