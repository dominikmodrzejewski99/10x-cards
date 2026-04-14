import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { FriendStatsComponent } from './friend-stats.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

describe('FriendStatsComponent', () => {
  let component: FriendStatsComponent;
  let fixture: ComponentFixture<FriendStatsComponent>;
  let routerMock: jasmine.SpyObj<Router>;
  let activatedRouteMock: { snapshot: { paramMap: { get: jasmine.Spy } } };

  const facadeMock: Record<string, jasmine.Spy> = {
    friendStatsSignal: jasmine.createSpy('friendStatsSignal').and.returnValue(null),
    myStatsSignal: jasmine.createSpy('myStatsSignal').and.returnValue(null),
    statsLoadingSignal: jasmine.createSpy('statsLoadingSignal').and.returnValue(false),
    statsErrorSignal: jasmine.createSpy('statsErrorSignal').and.returnValue(false),

    loadFriendStats: jasmine.createSpy('loadFriendStats'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.callFake(
            (key: string): string | null => key === 'userId' ? 'user-123' : null
          ),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [
        FriendStatsComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FriendsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FriendStatsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadFriendStats with userId from route', () => {
      component.ngOnInit();

      expect(facadeMock['loadFriendStats']).toHaveBeenCalledWith('user-123');
    });

    it('should redirect to /friends when userId is missing from route', () => {
      activatedRouteMock.snapshot.paramMap.get.and.returnValue(null);

      component.ngOnInit();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/friends']);
      expect(facadeMock['loadFriendStats']).not.toHaveBeenCalled();
    });
  });

  describe('goBack', () => {
    it('should navigate to /friends', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/friends']);
    });
  });
});
