import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LanguageTestFacadeService } from '../../services/facades/language-test-facade.service';

@Component({
  selector: 'app-language-test-list',
  imports: [RouterModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-list.component.html',
  styleUrl: './language-test-list.component.scss'
})
export class LanguageTestListComponent {
  private readonly facade: LanguageTestFacadeService = inject(LanguageTestFacadeService);
  public readonly levels = this.facade.getAvailableLevels();
}
