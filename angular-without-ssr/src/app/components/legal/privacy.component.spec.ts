import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  let component: PrivacyComponent;
  let fixture: ComponentFixture<PrivacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyComponent, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the privacy policy title', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const title: HTMLElement | null = compiled.querySelector('.legal__title');
    expect(title?.textContent).toContain('Polityka prywatno\u015Bci Memlo');
  });

  it('should render all legal sections', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const sections: NodeListOf<Element> = compiled.querySelectorAll('.legal__section');
    expect(sections.length).toBe(11);
  });

  it('should render the back link to home page', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const backLink: HTMLAnchorElement | null = compiled.querySelector('.legal__back-link');
    expect(backLink).toBeTruthy();
    expect(backLink?.getAttribute('href')).toBe('/');
  });
});
