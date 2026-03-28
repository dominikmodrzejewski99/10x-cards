import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../services/share.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-share-accept',
  standalone: true,
  imports: [ProgressSpinnerModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="share-accept">
        <p-progressSpinner />
        <p>Kopiowanie zestawu...</p>
      </div>
    } @else if (error()) {
      <div class="share-accept share-accept--error">
        <i class="pi pi-exclamation-triangle share-accept__icon"></i>
        <h2>Nie można skopiować zestawu</h2>
        <p>{{ error() }}</p>
        <p-button label="Przejdź do panelu" (onClick)="goToDashboard()" />
      </div>
    }
  `,
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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error.set('Nieprawidłowy link');
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
        this.error.set('Link wygasł. Poproś właściciela o nowy link.');
      } else if (message.includes('not found')) {
        this.error.set('Link jest nieprawidłowy lub został usunięty.');
      } else if (message.includes('no flashcards')) {
        this.error.set('Zestaw nie zawiera fiszek.');
      } else {
        this.error.set('Wystąpił błąd. Spróbuj ponownie później.');
      }
      this.loading.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
