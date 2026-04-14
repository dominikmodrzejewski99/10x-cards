import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { FriendsListComponent } from './friends-list.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

describe('FriendsListComponent', () => {
  let component: FriendsListComponent;
  let fixture: ComponentFixture<FriendsListComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    friendsSignal: jasmine.createSpy('friendsSignal').and.returnValue([]),
    pendingRequestsSignal: jasmine.createSpy('pendingRequestsSignal').and.returnValue([]),
    sentRequestsSignal: jasmine.createSpy('sentRequestsSignal').and.returnValue([]),
    loadingSignal: jasmine.createSpy('loadingSignal').and.returnValue(false),
    sendingSignal: jasmine.createSpy('sendingSignal').and.returnValue(false),
    emailInputSignal: jasmine.createSpy('emailInputSignal').and.returnValue(''),

    loadFriendsList: jasmine.createSpy('loadFriendsList'),
    sendRequest: jasmine.createSpy('sendRequest'),
    setEmailInput: jasmine.createSpy('setEmailInput'),
    acceptRequest: jasmine.createSpy('acceptRequest'),
    rejectRequest: jasmine.createSpy('rejectRequest'),
    removeFriend: jasmine.createSpy('removeFriend'),
    sendNudge: jasmine.createSpy('sendNudge'),
    cancelRequest: jasmine.createSpy('cancelRequest'),
    getDaysInactive: jasmine.createSpy('getDaysInactive').and.returnValue(null),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    await TestBed.configureTestingModule({
      imports: [
        FriendsListComponent,
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

    fixture = TestBed.createComponent(FriendsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadFriendsList()', () => {
      fixture.detectChanges();

      expect(facadeMock['loadFriendsList']).toHaveBeenCalledTimes(1);
    });
  });
});
