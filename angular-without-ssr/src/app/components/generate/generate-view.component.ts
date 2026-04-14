import { TranslocoDirective } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { GenerateFacadeService } from '../../services/facades/generate-facade.service';

import { LoadingIndicatorComponent } from './loading-indicator/loading-indicator.component';
import { ErrorMessageComponent } from './error-message/error-message.component';
import { FlashcardProposalListComponent } from './flashcard-proposal-list/flashcard-proposal-list.component';
import { BulkSaveButtonComponent } from './bulk-save-button/bulk-save-button.component';
import { GenerateButtonComponent } from './generate-button/generate-button.component';
import { SourceTextareaComponent } from './source-textarea/source-textarea.component';

@Component({
  selector: 'app-generate-view',
  imports: [
    FormsModule,
    RouterModule,
    LoadingIndicatorComponent,
    ErrorMessageComponent,
    FlashcardProposalListComponent,
    BulkSaveButtonComponent,
    GenerateButtonComponent,
    SourceTextareaComponent,
    TranslocoDirective,
  ],
  templateUrl: './generate-view.component.html',
  styleUrls: ['./generate-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenerateViewComponent implements OnInit {
  public readonly facade = inject(GenerateFacadeService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const target = this.facade.navigationTargetSignal();
      if (target) {
        this.facade.clearNavigationTarget();
        this.router.navigate(['/sets', target.setId], { queryParams: { saved: target.savedCount } });
      }
    });

    effect(() => {
      if (this.facade.needsAuthRedirectSignal()) {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit(): void {
    this.facade.loadSets();
    this.facade.loadDailyCount();
  }
}
