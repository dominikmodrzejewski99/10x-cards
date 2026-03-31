import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthStore } from '../../../auth/store';

describe('BottomNavComponent', () => {
  let fixture: ComponentFixture<BottomNavComponent>;
  let component: BottomNavComponent;
  let mockAuthStore: {
    authChecked: WritableSignal<boolean>;
    isAuthenticated: WritableSignal<boolean>;
  };

  beforeEach(async () => {
    mockAuthStore = {
      authChecked: signal<boolean>(true),
      isAuthenticated: signal<boolean>(true),
    };

    await TestBed.configureTestingModule({
      imports: [BottomNavComponent, TranslocoTestingModule.forRoot({ langs: { pl: { nav: { dashboard: 'Start', sets: 'Zestawy', study: 'Nauka', quiz: 'Quiz', generate: 'Generuj', mobileNav: 'Nawigacja mobilna' } } }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render bottom nav when authenticated and auth checked', () => {
    const el: HTMLElement = fixture.nativeElement;
    const nav: HTMLElement | null = el.querySelector('.bottom-nav');
    expect(nav).toBeTruthy();
  });

  it('should not render bottom nav when not authenticated', () => {
    mockAuthStore.isAuthenticated.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const nav: HTMLElement | null = el.querySelector('.bottom-nav');
    expect(nav).toBeNull();
  });

  it('should not render bottom nav when auth not checked', () => {
    mockAuthStore.authChecked.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const nav: HTMLElement | null = el.querySelector('.bottom-nav');
    expect(nav).toBeNull();
  });

  it('should render all 5 navigation links when authenticated', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links: NodeListOf<HTMLAnchorElement> = el.querySelectorAll('.bottom-nav__item');
    expect(links.length).toBe(5);
  });

  it('should have link to dashboard', () => {
    const el: HTMLElement = fixture.nativeElement;
    const dashboardLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/dashboard"]');
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink?.textContent).toContain('Start');
  });

  it('should have link to generate', () => {
    const el: HTMLElement = fixture.nativeElement;
    const generateLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/generate"]');
    expect(generateLink).toBeTruthy();
    expect(generateLink?.textContent).toContain('Generuj');
  });

  it('should have link to study', () => {
    const el: HTMLElement = fixture.nativeElement;
    const studyLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/study"]');
    expect(studyLink).toBeTruthy();
    expect(studyLink?.textContent).toContain('Nauka');
  });

  it('should have link to sets', () => {
    const el: HTMLElement = fixture.nativeElement;
    const setsLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/sets"]');
    expect(setsLink).toBeTruthy();
    expect(setsLink?.textContent).toContain('Zestawy');
  });

  it('should have link to quiz', () => {
    const el: HTMLElement = fixture.nativeElement;
    const quizLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/quiz"]');
    expect(quizLink).toBeTruthy();
    expect(quizLink?.textContent).toContain('Quiz');
  });

  it('should have proper aria label on nav element', () => {
    const el: HTMLElement = fixture.nativeElement;
    const nav: HTMLElement | null = el.querySelector('.bottom-nav');
    expect(nav?.getAttribute('aria-label')).toBe('Nawigacja mobilna');
  });

  it('should expose authStore signals', () => {
    expect(component.authCheckedSignal()).toBeTrue();
    expect(component.isAuthenticatedSignal()).toBeTrue();
  });
});
