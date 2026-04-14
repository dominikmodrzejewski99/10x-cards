import { Injectable, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { ReviewApiService } from '../../services/api/review-api.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewReminderService {
  private reviewApi = inject(ReviewApiService);
  private shownThisSession = false;

  checkDueCards(): Observable<number> {
    if (this.shownThisSession) {
      return of(0);
    }

    return this.reviewApi.getDueCards().pipe(
      map(cards => cards.length)
    );
  }

  markAsShown(): void {
    this.shownThisSession = true;
  }
}
