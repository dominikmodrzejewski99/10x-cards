import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { TermsComponent } from './terms.component';

describe('TermsComponent', () => {
  let component: TermsComponent;
  let fixture: ComponentFixture<TermsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsComponent, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TermsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the terms title', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const title: HTMLElement | null = compiled.querySelector('.legal__title');
    expect(title?.textContent).toContain('Regulamin serwisu Memlo');
  });

  it('should render all legal sections', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const sections: NodeListOf<Element> = compiled.querySelectorAll('.legal__section');
    expect(sections.length).toBe(10);
  });

  it('should render the back link to home page', () => {
    const compiled: HTMLElement = fixture.nativeElement as HTMLElement;
    const backLink: HTMLAnchorElement | null = compiled.querySelector('.legal__back-link');
    expect(backLink).toBeTruthy();
    expect(backLink?.getAttribute('href')).toBe('/');
  });
});
