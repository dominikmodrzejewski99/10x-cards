import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LandingPageComponent } from './landing-page.component';
import { AuthStore } from '../../auth/store';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;
  let mockAuthStore: {
    loginAnonymously: jasmine.Spy;
  };

  beforeEach(async () => {
    mockAuthStore = {
      loginAnonymously: jasmine.createSpy('loginAnonymously')
    };

    await TestBed.configureTestingModule({
      imports: [
        LandingPageComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set up IntersectionObserver on AfterViewInit', () => {
    fixture.detectChanges();
    // ngAfterViewInit is called during detectChanges, observer should be set up
    // Calling again should not throw
    expect(() => component.ngAfterViewInit()).not.toThrow();
  });

  it('should call loginAnonymously when tryAnonymously is called', () => {
    fixture.detectChanges();
    component.tryAnonymously();
    expect(mockAuthStore.loginAnonymously).toHaveBeenCalled();
  });

  it('should disconnect observer on destroy', () => {
    fixture.detectChanges();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('should handle ngOnDestroy when observer is null', () => {
    // Don't call detectChanges (no ngAfterViewInit), so observer is null
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
