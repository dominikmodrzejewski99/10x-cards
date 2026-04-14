import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, inject, OnInit, Signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LanguageTestFacadeService } from '../../services/facades/language-test-facade.service';
import { LanguageTestResultDTO, TestLevel } from '../../../types';

@Component({
  selector: 'app-language-test-results',
  imports: [RouterModule, NgxSkeletonLoaderModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-results.component.html',
  styleUrl: './language-test-results.component.scss'
})
export class LanguageTestResultsComponent implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly facade: LanguageTestFacadeService = inject(LanguageTestFacadeService);

  public readonly result: Signal<LanguageTestResultDTO | null> = this.facade.testResultSignal;
  public readonly loading: Signal<boolean> = this.facade.resultLoadingSignal;
  public readonly error: Signal<string | null> = this.facade.resultErrorSignal;
  public readonly generatingFlashcards: Signal<boolean> = this.facade.generatingFlashcardsSignal;
  public readonly flashcardsGenerated: Signal<boolean> = this.facade.flashcardsGeneratedSignal;
  public readonly categories: Signal<{ name: string; correct: number; total: number; percentage: number }[]> = this.facade.categoriesSignal;

  public ngOnInit(): void {
    const level: string | null = this.route.snapshot.paramMap.get('level');
    if (!level || !['b1', 'b2-fce', 'c1-cae'].includes(level)) {
      this.router.navigate(['/language-test']);
      return;
    }

    const stateResult: LanguageTestResultDTO | undefined = history.state?.result;
    this.facade.loadResult(level as TestLevel, stateResult);
  }

  public generateFlashcards(): void {
    this.facade.generateFlashcards();
  }

  public getLevelLabel(): string {
    return this.facade.getLevelLabel();
  }
}
