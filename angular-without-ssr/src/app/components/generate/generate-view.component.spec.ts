import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { GenerateViewComponent } from './generate-view.component';
import { GenerateFacadeService } from '../../services/generate-facade.service';

describe('GenerateViewComponent', () => {
  let component: GenerateViewComponent;
  let fixture: ComponentFixture<GenerateViewComponent>;
  let routerMock: jasmine.SpyObj<Router>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let facadeMock: any;

  beforeEach(async () => {
    facadeMock = {
      // Readonly signals (callable stubs returning default values)
      proposalsSignal: jasmine.createSpy('proposalsSignal').and.returnValue([]),
      generationResultSignal: jasmine.createSpy('generationResultSignal').and.returnValue(null),
      errorMessageSignal: jasmine.createSpy('errorMessageSignal').and.returnValue(null),
      isGeneratingSignal: jasmine.createSpy('isGeneratingSignal').and.returnValue(false),
      isSavingSignal: jasmine.createSpy('isSavingSignal').and.returnValue(false),
      sourceTextSignal: jasmine.createSpy('sourceTextSignal').and.returnValue(''),
      isSourceValidSignal: jasmine.createSpy('isSourceValidSignal').and.returnValue(false),
      setsSignal: jasmine.createSpy('setsSignal').and.returnValue([]),
      selectedSetIdSignal: jasmine.createSpy('selectedSetIdSignal').and.returnValue(null),
      newSetNameSignal: jasmine.createSpy('newSetNameSignal').and.returnValue(''),
      isCreatingSetSignal: jasmine.createSpy('isCreatingSetSignal').and.returnValue(false),
      dailyCountSignal: jasmine.createSpy('dailyCountSignal').and.returnValue(0),
      navigationTargetSignal: jasmine.createSpy('navigationTargetSignal').and.returnValue(null),
      needsAuthRedirectSignal: jasmine.createSpy('needsAuthRedirectSignal').and.returnValue(false),

      // Computed signals
      remainingGenerationsSignal: jasmine.createSpy('remainingGenerationsSignal').and.returnValue(5),
      limitReachedSignal: jasmine.createSpy('limitReachedSignal').and.returnValue(false),
      acceptedCountSignal: jasmine.createSpy('acceptedCountSignal').and.returnValue(0),
      canGenerateSignal: jasmine.createSpy('canGenerateSignal').and.returnValue(false),
      canSaveSignal: jasmine.createSpy('canSaveSignal').and.returnValue(false),
      isButtonLoadingSignal: jasmine.createSpy('isButtonLoadingSignal').and.returnValue(false),

      // Constants
      minTextLength: 1000,
      maxTextLength: 10000,
      dailyLimit: 5,

      // Methods
      loadSets: jasmine.createSpy('loadSets'),
      loadDailyCount: jasmine.createSpy('loadDailyCount'),
      generate: jasmine.createSpy('generate'),
      saveAllProposals: jasmine.createSpy('saveAllProposals'),
      acceptProposal: jasmine.createSpy('acceptProposal'),
      rejectProposal: jasmine.createSpy('rejectProposal'),
      toggleAcceptAll: jasmine.createSpy('toggleAcceptAll'),
      editProposal: jasmine.createSpy('editProposal'),
      onTextChange: jasmine.createSpy('onTextChange'),
      onValidityChange: jasmine.createSpy('onValidityChange'),
      setSelectedSetId: jasmine.createSpy('setSelectedSetId'),
      setNewSetName: jasmine.createSpy('setNewSetName'),
      createNewSet: jasmine.createSpy('createNewSet'),
      dismissError: jasmine.createSpy('dismissError'),
      clearNavigationTarget: jasmine.createSpy('clearNavigationTarget'),
    };

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        GenerateViewComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GenerateFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadSets()', () => {
      fixture.detectChanges();
      expect(facadeMock.loadSets).toHaveBeenCalled();
    });

    it('should call facade.loadDailyCount()', () => {
      fixture.detectChanges();
      expect(facadeMock.loadDailyCount).toHaveBeenCalled();
    });
  });

  describe('navigation effect', () => {
    it('should navigate to set detail when navigationTargetSignal has a value', () => {
      facadeMock.navigationTargetSignal.and.returnValue({ setId: 10, savedCount: 3 });

      fixture.detectChanges();

      expect(facadeMock.clearNavigationTarget).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['/sets', 10],
        { queryParams: { saved: 3 } }
      );
    });

    it('should not navigate when navigationTargetSignal is null', () => {
      facadeMock.navigationTargetSignal.and.returnValue(null);

      fixture.detectChanges();

      expect(facadeMock.clearNavigationTarget).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('auth redirect effect', () => {
    it('should navigate to /login when needsAuthRedirectSignal is true', () => {
      facadeMock.needsAuthRedirectSignal.and.returnValue(true);

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not navigate to /login when needsAuthRedirectSignal is false', () => {
      facadeMock.needsAuthRedirectSignal.and.returnValue(false);

      fixture.detectChanges();

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
