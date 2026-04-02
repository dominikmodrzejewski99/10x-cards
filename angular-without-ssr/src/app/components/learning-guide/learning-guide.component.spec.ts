import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';

import { LearningGuideComponent } from './learning-guide.component';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('LearningGuideComponent', () => {
  let component: LearningGuideComponent;
  let fixture: ComponentFixture<LearningGuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearningGuideComponent, RouterModule.forRoot([]), TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LearningGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have articles populated', () => {
      expect(component.articles.length).toBeGreaterThan(0);
    });

    it('should have dkStages populated', () => {
      expect(component.dkStages.length).toBe(5);
    });

    it('should have no expanded articles initially', () => {
      expect(component.expandedCountSignal()).toBe(0);
    });

    it('should have showRepetitions as false', () => {
      expect(component.showRepetitionsSignal()).toBeFalse();
    });

    it('should have dkActiveStage as null', () => {
      expect(component.dkActiveStageSignal()).toBeNull();
    });
  });

  describe('isExpanded', () => {
    it('should return false for non-expanded article', () => {
      expect(component.isExpanded('spaced-repetition')).toBeFalse();
    });

    it('should return true after toggling an article', () => {
      component.toggleArticle('spaced-repetition');
      expect(component.isExpanded('spaced-repetition')).toBeTrue();
    });
  });

  describe('toggleArticle', () => {
    it('should expand an article', () => {
      component.toggleArticle('active-recall');
      expect(component.isExpanded('active-recall')).toBeTrue();
      expect(component.expandedCountSignal()).toBe(1);
    });

    it('should collapse an already expanded article', () => {
      component.toggleArticle('active-recall');
      component.toggleArticle('active-recall');
      expect(component.isExpanded('active-recall')).toBeFalse();
      expect(component.expandedCountSignal()).toBe(0);
    });

    it('should allow multiple articles to be expanded', () => {
      component.toggleArticle('active-recall');
      component.toggleArticle('forgetting-curve');
      expect(component.expandedCountSignal()).toBe(2);
    });
  });

  describe('expandAll', () => {
    it('should expand all articles', () => {
      component.expandAll();
      expect(component.expandedCountSignal()).toBe(component.articles.length);
    });
  });

  describe('collapseAll', () => {
    it('should collapse all articles', () => {
      component.expandAll();
      component.collapseAll();
      expect(component.expandedCountSignal()).toBe(0);
    });
  });

  describe('toggleRepetitions', () => {
    it('should toggle showRepetitions', () => {
      component.toggleRepetitions();
      expect(component.showRepetitionsSignal()).toBeTrue();

      component.toggleRepetitions();
      expect(component.showRepetitionsSignal()).toBeFalse();
    });
  });

  describe('setDkStage', () => {
    it('should set the active DK stage', () => {
      component.setDkStage(2);
      expect(component.dkActiveStageSignal()).toBe(2);
    });

    it('should set stage to null', () => {
      component.setDkStage(2);
      component.setDkStage(null);
      expect(component.dkActiveStageSignal()).toBeNull();
    });
  });
});
