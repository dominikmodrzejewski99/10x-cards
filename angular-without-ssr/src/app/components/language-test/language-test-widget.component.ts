import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { LanguageTestResultDTO } from '../../../types';

@Component({
  selector: 'app-language-test-widget',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (!loading()) {
      <div class="dash__card dash__card--test-widget">
        @if (latestResult(); as r) {
          <div class="dash__test-result">
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
          <div class="dash__test-cta">
            <i class="pi pi-check-square"></i>
            <div>
              <strong>Nie znasz jeszcze swojego poziomu?</strong>
              <p>Sprawdź znajomość angielskiego na poziomie B1, B2 lub C1</p>
            </div>
            <a routerLink="/language-test" class="dash__test-btn">Sprawdź poziom →</a>
          </div>
        }
      </div>
    }
  `,
  styles: []
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
