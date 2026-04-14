import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { FriendsLeaderboardComponent } from './friends-leaderboard.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

describe('FriendsLeaderboardComponent', () => {
  let component: FriendsLeaderboardComponent;
  let fixture: ComponentFixture<FriendsLeaderboardComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    leaderboardEntriesSignal: jasmine.createSpy('leaderboardEntriesSignal').and.returnValue([]),
    leaderboardLoadingSignal: jasmine.createSpy('leaderboardLoadingSignal').and.returnValue(false),
    activeCategorySignal: jasmine.createSpy('activeCategorySignal').and.returnValue('streak'),
    sortedEntriesSignal: jasmine.createSpy('sortedEntriesSignal').and.returnValue([]),

    loadLeaderboard: jasmine.createSpy('loadLeaderboard'),
    setActiveCategory: jasmine.createSpy('setActiveCategory'),
    getValueForCategory: jasmine.createSpy('getValueForCategory').and.returnValue(0),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    await TestBed.configureTestingModule({
      imports: [
        FriendsLeaderboardComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FriendsFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FriendsLeaderboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadLeaderboard()', () => {
      fixture.detectChanges();

      expect(facadeMock['loadLeaderboard']).toHaveBeenCalledTimes(1);
    });
  });
});
