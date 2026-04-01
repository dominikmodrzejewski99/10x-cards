import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { CookieConsentService } from '../../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  imports: [RouterModule, TranslocoDirective],
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CookieConsentComponent {
  readonly consentService = inject(CookieConsentService);

  accept(): void {
    this.consentService.accept();
  }

  reject(): void {
    this.consentService.reject();
  }
}
