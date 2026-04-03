import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { FriendStatsComponent } from './friend-stats.component';
import { FriendshipService } from '../../services/friendship.service';
import { UserPreferencesService } from '../../services/user-preferences.service';

describe('FriendStatsComponent', () => {
  let component: FriendStatsComponent;
  let fixture: ComponentFixture<FriendStatsComponent>;
  let friendshipServiceMock: jasmine.SpyObj<FriendshipService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    friendshipServiceMock = jasmine.createSpyObj('FriendshipService', ['getFriendStats']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    const prefsMock = {
      getPreferences: () => of({
        current_streak: 10,
        longest_streak: 20,
        total_sessions: 50,
        total_cards_reviewed: 500,
        last_study_date: '2026-04-01'
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        FriendStatsComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: FriendshipService, useValue: friendshipServiceMock },
        { provide: UserPreferencesService, useValue: prefsMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'user-123' } } }
        }
      ]
    })
    .overrideComponent(FriendStatsComponent, {
      set: { providers: [{ provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['add']) }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FriendStatsComponent);
    component = fixture.componentInstance;
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien zaladowac statystyki przy init', async () => {
    friendshipServiceMock.getFriendStats.and.returnValue(Promise.resolve({
      user_id: 'user-123',
      email_masked: 'te...@test.com',
      current_streak: 5,
      longest_streak: 15,
      total_sessions: 30,
      total_cards_reviewed: 300,
      last_study_date: '2026-03-30',
      last_active_at: null
    }));

    component.ngOnInit();
    // Wait for all microtasks (Promises) to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    await fixture.whenStable();

    expect(friendshipServiceMock.getFriendStats).toHaveBeenCalledWith('user-123');
    expect(component.friendStats()).toBeTruthy();
    expect(component.myStats()).toBeTruthy();
    expect(component.loading()).toBeFalse();
  });

  it('powinien przekierowac gdy brak userId w route', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        FriendStatsComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: FriendshipService, useValue: friendshipServiceMock },
        { provide: UserPreferencesService, useValue: { getPreferences: () => of({}) } },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['add']) },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } }
        }
      ]
    }).compileComponents();

    const fix = TestBed.createComponent(FriendStatsComponent);
    const comp = fix.componentInstance;
    comp.ngOnInit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/friends']);
  });

  it('powinien nawigowac do /friends na goBack', () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/friends']);
  });
});
