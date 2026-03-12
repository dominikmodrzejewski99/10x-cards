import { Component, AfterViewInit, OnDestroy, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';

import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../auth/store/auth.actions';

@Component({
  selector: 'app-landing-page',
  imports: [RouterModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'landing-host'
  }
})
export class LandingPageComponent implements AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private store = inject(Store);

  constructor(private el: ElementRef<HTMLElement>) {}

  tryAnonymously(): void {
    this.store.dispatch(AuthActions.loginAnonymously());
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in-view');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
    );

    const animatedEls: NodeListOf<Element> = this.el.nativeElement.querySelectorAll('[data-animate]');
    animatedEls.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
