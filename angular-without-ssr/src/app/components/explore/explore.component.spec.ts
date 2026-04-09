import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ExploreComponent } from './explore.component';
import { ExploreFacadeService } from '../../services/explore-facade.service';

describe('ExploreComponent', () => {
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    setsSignal: jasmine.createSpy('setsSignal').and.returnValue([]),
    loadingSignal: jasmine.createSpy('loadingSignal').and.returnValue(false),
    errorSignal: jasmine.createSpy('errorSignal').and.returnValue(null),
    searchSignal: jasmine.createSpy('searchSignal').and.returnValue(''),
    sortSignal: jasmine.createSpy('sortSignal').and.returnValue('popular'),
    pageSignal: jasmine.createSpy('pageSignal').and.returnValue(1),
    pageSizeSignal: jasmine.createSpy('pageSizeSignal').and.returnValue(12),
    totalSignal: jasmine.createSpy('totalSignal').and.returnValue(0),
    selectedTagsSignal: jasmine.createSpy('selectedTagsSignal').and.returnValue([]),
    popularTagsSignal: jasmine.createSpy('popularTagsSignal').and.returnValue([]),
    copyDialogVisibleSignal: jasmine.createSpy('copyDialogVisibleSignal').and.returnValue(false),
    copyDialogRememberSignal: jasmine.createSpy('copyDialogRememberSignal').and.returnValue(false),
    totalPagesSignal: jasmine.createSpy('totalPagesSignal').and.returnValue(0),

    init: jasmine.createSpy('init'),
    destroy: jasmine.createSpy('destroy'),
    loadPopularTags: jasmine.createSpy('loadPopularTags'),
    loadSets: jasmine.createSpy('loadSets'),
    onSearchInput: jasmine.createSpy('onSearchInput'),
    toggleTag: jasmine.createSpy('toggleTag'),
    clearTags: jasmine.createSpy('clearTags'),
    onSortChange: jasmine.createSpy('onSortChange'),
    onPageChange: jasmine.createSpy('onPageChange'),
    requestCopy: jasmine.createSpy('requestCopy'),
    confirmCopy: jasmine.createSpy('confirmCopy'),
    cancelCopy: jasmine.createSpy('cancelCopy'),
    toggleCopyDialogRemember: jasmine.createSpy('toggleCopyDialogRemember'),
  };

  beforeEach(async () => {
    // Reset all spies between tests
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    await TestBed.configureTestingModule({
      imports: [
        ExploreComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ExploreFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.init()', () => {
      fixture.detectChanges();

      expect(facadeMock['init']).toHaveBeenCalledTimes(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call facade.destroy()', () => {
      component.ngOnDestroy();

      expect(facadeMock['destroy']).toHaveBeenCalledTimes(1);
    });
  });
});
