import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LanguageTestWidgetComponent } from './language-test-widget.component';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { LanguageTestResultDTO } from '../../../types';

describe('LanguageTestWidgetComponent', () => {
  let component: LanguageTestWidgetComponent;
  let fixture: ComponentFixture<LanguageTestWidgetComponent>;
  let resultsServiceMock: jasmine.SpyObj<LanguageTestResultsService>;

  const mockResult: LanguageTestResultDTO = {
    id: 1,
    user_id: 'user-1',
    level: 'b2-fce',
    total_score: 20,
    max_score: 30,
    percentage: 67,
    category_breakdown: { grammar: { correct: 8, total: 10 } },
    wrong_answers: [],
    generated_set_id: null,
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(async () => {
    resultsServiceMock = jasmine.createSpyObj<LanguageTestResultsService>('LanguageTestResultsService', ['getLatestResult']);
    resultsServiceMock.getLatestResult.and.returnValue(of(mockResult));

    await TestBed.configureTestingModule({
      imports: [LanguageTestWidgetComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LanguageTestResultsService, useValue: resultsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load latest result and set loading to false', () => {
      fixture.detectChanges();

      expect(resultsServiceMock.getLatestResult).toHaveBeenCalled();
      expect(component.latestResult()).toEqual(mockResult);
      expect(component.loading()).toBeFalse();
    });

    it('should set latestResult to null when no result exists', () => {
      resultsServiceMock.getLatestResult.and.returnValue(of(null));

      fixture.detectChanges();

      expect(component.latestResult()).toBeNull();
      expect(component.loading()).toBeFalse();
    });

    it('should set loading to false on error', () => {
      resultsServiceMock.getLatestResult.and.returnValue(throwError(() => new Error('fail')));

      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
      expect(component.latestResult()).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      expect(component.loading()).toBeTrue();
    });
  });

  describe('getLevelLabel', () => {
    it('should return "B1" for b1 level', () => {
      expect(component.getLevelLabel('b1')).toBe('B1');
    });

    it('should return "B2 FCE" for b2-fce level', () => {
      expect(component.getLevelLabel('b2-fce')).toBe('B2 FCE');
    });

    it('should return "C1 CAE" for c1-cae level', () => {
      expect(component.getLevelLabel('c1-cae')).toBe('C1 CAE');
    });

    it('should return "C1 CAE" for unknown levels', () => {
      expect(component.getLevelLabel('other')).toBe('C1 CAE');
    });
  });

  describe('getRelativeDate', () => {
    it('should return "Dzisiaj" for today', () => {
      const today: string = new Date().toISOString();

      expect(component.getRelativeDate(today)).toBe('Dzisiaj');
    });

    it('should return "Wczoraj" for yesterday', () => {
      const yesterday: Date = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr: string = yesterday.toISOString();

      expect(component.getRelativeDate(yesterdayStr)).toBe('Wczoraj');
    });

    it('should return "X dni temu" for older dates', () => {
      const threeDaysAgo: Date = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const dateStr: string = threeDaysAgo.toISOString();

      expect(component.getRelativeDate(dateStr)).toBe('3 dni temu');
    });
  });
});
