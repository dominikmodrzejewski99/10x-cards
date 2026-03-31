import { Component, AfterViewInit, OnDestroy, ElementRef, ChangeDetectionStrategy, inject, signal } from '@angular/core';

import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthStore } from '../../auth/store';

@Component({
  selector: 'app-landing-page',
  imports: [RouterModule, TranslocoDirective],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'landing-host'
  }
})
export class LandingPageComponent implements AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private demoObserver: IntersectionObserver | null = null;
  private authStore = inject(AuthStore);

  demoFlipped = signal(false);

  constructor(private el: ElementRef<HTMLElement>) {}

  tryAnonymously(): void {
    this.authStore.loginAnonymously();
  }

  toggleDemoFlip(): void {
    this.demoFlipped.update(v => !v);
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

    // Flip demo card once on first scroll into view
    const demoCard: HTMLElement | null = this.el.nativeElement.querySelector('.demo__flipcard');
    if (demoCard) {
      this.demoObserver = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          if (entries[0].isIntersecting) {
            setTimeout(() => this.demoFlipped.set(true), 800);
            this.demoObserver?.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      this.demoObserver.observe(demoCard);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.demoObserver?.disconnect();
  }
}
