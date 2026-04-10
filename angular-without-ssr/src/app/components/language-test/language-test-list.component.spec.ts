import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LanguageTestListComponent } from './language-test-list.component';
import { LanguageTestFacadeService } from '../../services/language-test-facade.service';
import { TestLevel } from '../../../types';

describe('LanguageTestListComponent', () => {
  let component: LanguageTestListComponent;
  let fixture: ComponentFixture<LanguageTestListComponent>;

  const mockLevels: { level: TestLevel; title: string; description: string; questionCount: number; estimatedMinutes: number }[] = [
    { level: 'b1', title: 'B1 Preliminary', description: 'Test B1', questionCount: 30, estimatedMinutes: 20 },
    { level: 'b2-fce', title: 'B2 First (FCE)', description: 'Test B2', questionCount: 30, estimatedMinutes: 25 },
    { level: 'c1-cae', title: 'C1 Advanced (CAE)', description: 'Test C1', questionCount: 30, estimatedMinutes: 30 },
  ];

  const facadeMock = {
    getAvailableLevels: jasmine.createSpy('getAvailableLevels').and.returnValue(mockLevels),
  };

  beforeEach(async () => {
    facadeMock.getAvailableLevels.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        LanguageTestListComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideRouter([]),
        { provide: LanguageTestFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestListComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should load available levels from facade', () => {
    fixture.detectChanges();

    expect(facadeMock.getAvailableLevels).toHaveBeenCalled();
    expect(component.levels).toEqual(mockLevels);
  });

  it('should contain all three test levels', () => {
    fixture.detectChanges();

    expect(component.levels.length).toBe(3);
    expect(component.levels[0].level).toBe('b1');
    expect(component.levels[1].level).toBe('b2-fce');
    expect(component.levels[2].level).toBe('c1-cae');
  });
});
