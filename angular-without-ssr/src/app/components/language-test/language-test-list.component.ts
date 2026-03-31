import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LanguageTestBankService } from '../../services/language-test-bank.service';

@Component({
  selector: 'app-language-test-list',
  standalone: true,
  imports: [RouterModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-list.component.html',
  styleUrl: './language-test-list.component.scss'
})
export class LanguageTestListComponent {
  private bankService = inject(LanguageTestBankService);
  levels = this.bankService.getAvailableLevels();
}
