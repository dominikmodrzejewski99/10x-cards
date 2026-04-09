import { Component, OnInit, inject, Injector, ChangeDetectionStrategy, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { QuizFacadeService } from '../../services/quiz-facade.service';
import { QuizConfigComponent } from './quiz-config/quiz-config.component';
import { QuizQuestionComponent } from './quiz-question/quiz-question.component';
import { QuizResultsComponent } from './quiz-results/quiz-results.component';
import { QuizConfig, QuizAnswer } from '../../../types';

@Component({
  selector: 'app-quiz-view',
  imports: [NgxSkeletonLoaderModule, QuizConfigComponent, QuizQuestionComponent, QuizResultsComponent],
  templateUrl: './quiz-view.component.html',
  styleUrls: ['./quiz-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizViewComponent implements OnInit {
  public readonly facade: QuizFacadeService = inject(QuizFacadeService);
  private readonly router: Router = inject(Router);
  private readonly injector: Injector = inject(Injector);
  private readonly routeParams = toSignal(inject(ActivatedRoute).params, { initialValue: {} as Record<string, string> });

  public ngOnInit(): void {
    effect(() => {
      const setId: number = Number(this.routeParams()['setId']);
      if (!setId) {
        this.router.navigate(['/quiz']);
        return;
      }
      this.facade.loadSetData(setId);
    }, { injector: this.injector });
  }

  public onStartQuiz(config: QuizConfig): void {
    this.facade.startQuiz(config);
  }

  public onAnswerSubmitted(answer: QuizAnswer): void {
    this.facade.submitAnswer(answer);
  }

  public onRetry(): void {
    this.facade.retry();
  }

  public onRetryWrong(): void {
    this.facade.retryWrong();
  }

  public onRetryStarred(questionIds: number[]): void {
    this.facade.retryStarred(questionIds);
  }

  public onGoBack(): void {
    this.router.navigate(['/sets', this.facade.setIdSignal()]);
  }

  public onGoBackFromConfig(): void {
    this.router.navigate(['/sets', this.facade.setIdSignal()]);
  }
}
