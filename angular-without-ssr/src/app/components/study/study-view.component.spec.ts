import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { StudyViewComponent } from './study-view.component';
import { StudyFacadeService } from '../../services/facades/study-facade.service';
import { FlashcardSetDTO, SessionResultDTO, StudyCardDTO } from '../../../types';

describe('StudyViewComponent', () => {
  let component: StudyViewComponent;
  let fixture: ComponentFixture<StudyViewComponent>;

  let facadeMock: jasmine.SpyObj<StudyFacadeService>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockCards: StudyCardDTO[] = [
    {
      flashcard: { id: 1, front: 'Hello', back: 'Cześć', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: 'u1', generation_id: null, set_id: 1, position: 0 },
      review: null
    },
    {
      flashcard: { id: 2, front: 'World', back: 'Świat', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: 'u1', generation_id: null, set_id: 1, position: 0 },
      review: null
    }
  ];

  const mockSets: FlashcardSetDTO[] = [
    { id: 1, user_id: 'u1', name: 'Set A', description: null, tags: [], is_public: false, copy_count: 0, published_at: null, created_at: '', updated_at: '' }
  ];

  beforeEach(async () => {
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({});

    facadeMock = jasmine.createSpyObj<StudyFacadeService>('StudyFacadeService', [
      'loadSets', 'selectSet', 'loadDueCards', 'loadExtraPractice',
      'flip', 'answer', 'shuffleCards', 'restoreOrder',
      'toggleTrackProgress', 'toggleDirection',
      'restartSession', 'restartWithFailedCards',
      'updateSetSearch', 'formatDate', 'destroy'
    ], {
      dueCardsSignal: signal<StudyCardDTO[]>(mockCards),
      setsSignal: signal<FlashcardSetDTO[]>(mockSets),
      selectedSetIdSignal: signal<number | null>(null),
      failedCardsSignal: signal<StudyCardDTO[]>([]),
      currentIndexSignal: signal<number>(0),
      sessionResultsSignal: signal<SessionResultDTO>({ known: 0, hard: 0, unknown: 0, total: 0 }),
      nextReviewDateSignal: signal<string | null>(null),
      isFlippedSignal: signal<boolean>(false),
      skipTransitionSignal: signal<boolean>(false),
      isShuffledSignal: signal<boolean>(false),
      isReversedSignal: signal<boolean>(false),
      trackProgressSignal: signal<boolean>(true),
      isSessionCompleteSignal: signal<boolean>(false),
      loadingSignal: signal<boolean>(false),
      savingSignal: signal<boolean>(false),
      errorSignal: signal<string | null>(null),
      setSearchSignal: signal<string>(''),
      currentCardSignal: signal<StudyCardDTO | null>(mockCards[0]),
      failedCountSignal: signal<number>(0),
      progressPercentSignal: signal<number>(50),
      displayFrontSignal: signal<string>('Hello'),
      displayBackSignal: signal<string>('Cześć'),
      displayFrontImageSignal: signal<string | null>(null),
      displayBackAudioSignal: signal<string | null>(null),
      currentSetNameSignal: signal<string | null>(null),
      filteredSetsSignal: signal<FlashcardSetDTO[]>(mockSets)
    });

    await TestBed.configureTestingModule({
      imports: [StudyViewComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: StudyFacadeService, useValue: facadeMock },
        { provide: ActivatedRoute, useValue: { queryParams: queryParamsSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadSets and facade.selectSet', () => {
      fixture.detectChanges();

      expect(facadeMock.loadSets).toHaveBeenCalled();
      expect(facadeMock.selectSet).toHaveBeenCalledWith(null);
    });

    it('should pass setId from query params to facade', () => {
      queryParamsSubject.next({ setId: '5' });
      fixture.detectChanges();

      expect(facadeMock.selectSet).toHaveBeenCalledWith(5);
    });
  });

  describe('handleKeyboard', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should call facade.flip on Space when not flipped', () => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: ' ' });
      component.handleKeyboard(event);
      expect(facadeMock.flip).toHaveBeenCalled();
    });

    it('should not call facade.answer on key 1 when not flipped', () => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeyboard(event);
      expect(facadeMock.answer).not.toHaveBeenCalled();
    });
  });

  describe('toggleFullscreen', () => {
    it('should have fullscreen signal initially false', () => {
      expect(component.isFullscreenSignal()).toBeFalse();
    });
  });

  describe('openSetModal', () => {
    it('should open modal and clear search', () => {
      fixture.detectChanges();
      component.openSetModal();
      expect(component.showSetModalSignal()).toBeTrue();
      expect(facadeMock.updateSetSearch).toHaveBeenCalledWith('');
    });
  });

  describe('selectSetFromModal', () => {
    it('should close modal and select set', () => {
      fixture.detectChanges();
      component.showSetModalSignal.set(true);
      component.selectSetFromModal(5);
      expect(component.showSetModalSignal()).toBeFalse();
      expect(facadeMock.selectSet).toHaveBeenCalledWith(5);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call facade.destroy', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      expect(facadeMock.destroy).toHaveBeenCalled();
    });
  });
});
