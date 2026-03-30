import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { LanguageTestResultDTO } from '../../../types';

@Component({
  selector: 'app-language-test-widget',
  standalone: true,
  imports: [RouterModule, NgxSkeletonLoaderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.Emulated,
  template: `
    <div class="dash__card dash__card--test-widget">
      @if (loading()) {
        <div class="dash__test-cta">
          <ngx-skeleton-loader appearance="circle" [theme]="{ width: '3rem', height: '3rem', 'border-radius': '0.85rem', 'flex-shrink': '0' }"></ngx-skeleton-loader>
          <div class="dash__test-cta-body">
            <ngx-skeleton-loader [theme]="{ width: '70%', height: '0.95rem', 'margin-bottom': '0.3rem', 'border-radius': '0.25rem' }"></ngx-skeleton-loader>
            <ngx-skeleton-loader [theme]="{ width: '90%', height: '0.78rem', 'border-radius': '0.25rem' }"></ngx-skeleton-loader>
          </div>
        </div>
      } @else if (latestResult(); as r) {
        <div class="dash__test-result fade-in">
          <div class="dash__test-score" [class.dash__test-score--pass]="r.percentage >= 60" [class.dash__test-score--fail]="r.percentage < 60">
            {{ r.percentage }}%
          </div>
          <div class="dash__test-info">
            <strong>{{ getLevelLabel(r.level) }} — {{ r.percentage >= 60 ? 'Zdane!' : 'Nie zdane' }}</strong>
            <span class="dash__test-date">{{ getRelativeDate(r.completed_at) }}</span>
          </div>
          <div class="dash__test-actions">
            <a [routerLink]="['/language-test', r.level]" class="dash__test-btn">Powtórz</a>
            <a routerLink="/language-test" class="dash__test-btn dash__test-btn--secondary">Inny test</a>
          </div>
        </div>
      } @else {
        <a routerLink="/language-test" class="dash__test-cta fade-in">
          <div class="dash__test-cta-icon">
            <i class="pi pi-check-square"></i>
          </div>
          <div class="dash__test-cta-body">
            <div class="dash__test-cta-title">Nie znasz jeszcze swojego poziomu?</div>
            <div class="dash__test-cta-desc">Sprawdź znajomość angielskiego na poziomie B1, B2 lub C1</div>
          </div>
          <i class="pi pi-arrow-right dash__test-cta-arrow"></i>
        </a>
      }
    </div>
  `,
  styles: [`
    /* Language Test Widget */
    .dash__card--test-widget {
      padding: 1.25rem 1.5rem;
      background: var(--app-primary-light);
      border: 1.5px solid var(--app-border);
      border-radius: 1.25rem;
      margin-bottom: 2rem;
      transition: border-color 0.2s;
    }

    .dash__card--test-widget:hover {
      border-color: var(--app-primary);
    }

    .dash__test-result {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .dash__test-score {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      border: 3px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      font-weight: 800;
      flex-shrink: 0;
    }

    .dash__test-score--pass {
      border-color: #10b981;
      color: #10b981;
    }

    .dash__test-score--fail {
      border-color: #ef4444;
      color: #ef4444;
    }

    .dash__test-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .dash__test-date {
      font-size: 0.75rem;
      color: var(--app-text-secondary, #586380);
    }

    .dash__test-actions {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .dash__test-btn {
      display: inline-block;
      padding: 0.35rem 0.8rem;
      border: 1.5px solid var(--app-primary, #8b5cf6);
      color: var(--app-primary, #8b5cf6);
      border-radius: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s;
    }

    .dash__test-btn:hover {
      background: var(--app-primary, #8b5cf6);
      color: #fff;
    }

    .dash__test-btn--secondary {
      border-color: var(--app-border, #d9dbe9);
      color: var(--app-text-secondary, #586380);
    }

    .dash__test-btn--secondary:hover {
      background: var(--app-bg, #f6f7fb);
      color: var(--app-text, #1a1c2e);
    }

    .dash__test-cta {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      text-decoration: none;
      color: inherit;
    }

    .dash__test-cta-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.85rem;
      background: var(--app-purple-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      color: var(--app-purple);
      flex-shrink: 0;
    }

    .dash__test-cta-body {
      flex: 1;
      min-width: 0;
    }

    .dash__test-cta-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--app-text, #1a1c2e);
    }

    .dash__test-cta-desc {
      font-size: 0.78rem;
      color: var(--app-text-secondary, #586380);
      margin-top: 0.15rem;
    }

    .dash__test-cta-arrow {
      font-size: 1rem;
      color: var(--app-primary, #8b5cf6);
      opacity: 0.5;
      transition: all 0.3s;
    }

    .dash__card--test-widget:hover .dash__test-cta-arrow {
      opacity: 0.9;
      transform: translateX(4px);
    }

    @media (max-width: 600px) {
      .dash__test-result {
        flex-direction: column;
        text-align: center;
      }

      .dash__test-actions {
        flex-direction: row;
        width: 100%;
      }

      .dash__test-btn {
        flex: 1;
      }

      .dash__test-cta-arrow {
        display: none;
      }
    }
  `]
})
export class LanguageTestWidgetComponent implements OnInit {
  private resultsService = inject(LanguageTestResultsService);
  latestResult = signal<LanguageTestResultDTO | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.resultsService.getLatestResult().subscribe({
      next: result => {
        this.latestResult.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getLevelLabel(level: string): string {
    if (level === 'b1') return 'B1';
    if (level === 'b2-fce') return 'B2 FCE';
    return 'C1 CAE';
  }

  getRelativeDate(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return 'Dzisiaj';
    if (days === 1) return 'Wczoraj';
    return `${days} dni temu`;
  }
}
