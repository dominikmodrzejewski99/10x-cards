import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';

import { TranslocoTestingModule } from '@jsverse/transloco';

import { LanguageTestListComponent } from './language-test-list.component';
import { LanguageTestBankService } from '../../services/language-test-bank.service';
import { TestLevel } from '../../../types';

describe('LanguageTestListComponent', () => {
  let component: LanguageTestListComponent;
  let fixture: ComponentFixture<LanguageTestListComponent>;
  let bankServiceMock: jasmine.SpyObj<LanguageTestBankService>;

  const mockLevels: { level: TestLevel; title: string; description: string; questionCount: number; estimatedMinutes: number }[] = [
    { level: 'b1', title: 'B1 Preliminary', description: 'Test B1', questionCount: 30, estimatedMinutes: 20 },
    { level: 'b2-fce', title: 'B2 First (FCE)', description: 'Test B2', questionCount: 30, estimatedMinutes: 25 },
    { level: 'c1-cae', title: 'C1 Advanced (CAE)', description: 'Test C1', questionCount: 30, estimatedMinutes: 30 }
  ];

  beforeEach(async () => {
    bankServiceMock = jasmine.createSpyObj<LanguageTestBankService>('LanguageTestBankService', ['getAvailableLevels']);
    bankServiceMock.getAvailableLevels.and.returnValue(mockLevels);

    await TestBed.configureTestingModule({
      imports: [
        LanguageTestListComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideRouter([]),
        { provide: LanguageTestBankService, useValue: bankServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestListComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should load available levels from bank service', () => {
    fixture.detectChanges();

    expect(bankServiceMock.getAvailableLevels).toHaveBeenCalled();
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
