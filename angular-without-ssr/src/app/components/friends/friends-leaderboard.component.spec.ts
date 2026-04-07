import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { FriendsLeaderboardComponent } from './friends-leaderboard.component';
import { FriendshipService } from '../../services/friendship.service';
import { LeaderboardEntryDTO } from '../../../types';

describe('FriendsLeaderboardComponent', () => {
  let component: FriendsLeaderboardComponent;
  let fixture: ComponentFixture<FriendsLeaderboardComponent>;
  let friendshipServiceMock: jasmine.SpyObj<FriendshipService>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;

  const mockEntries: LeaderboardEntryDTO[] = [
    { user_id: 'u1', email_masked: 'te...@test.com', current_streak: 10, total_cards_reviewed: 200, cards_this_week: 15, is_current_user: true },
    { user_id: 'u2', email_masked: 'jo...@test.com', current_streak: 5, total_cards_reviewed: 300, cards_this_week: 30, is_current_user: false },
    { user_id: 'u3', email_masked: 'an...@test.com', current_streak: 8, total_cards_reviewed: 100, cards_this_week: 5, is_current_user: false }
  ];

  beforeEach(async () => {
    friendshipServiceMock = jasmine.createSpyObj('FriendshipService', ['getLeaderboard']);
    toastServiceMock = jasmine.createSpyObj('ToastService', ['add']);

    friendshipServiceMock.getLeaderboard.and.returnValue(Promise.resolve(mockEntries));

    await TestBed.configureTestingModule({
      imports: [
        FriendsLeaderboardComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: FriendshipService, useValue: friendshipServiceMock }
      ]
    })
    .overrideComponent(FriendsLeaderboardComponent, {
      set: { providers: [{ provide: ToastService, useValue: toastServiceMock }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FriendsLeaderboardComponent);
    component = fixture.componentInstance;
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien zaladowac ranking', async () => {
    await component.loadLeaderboard();

    expect(friendshipServiceMock.getLeaderboard).toHaveBeenCalled();
    expect(component.entries().length).toBe(3);
    expect(component.loading()).toBeFalse();
  });

  it('powinien sortowac po streak domyslnie', async () => {
    await component.loadLeaderboard();
    const sorted = component.sortedEntries();

    expect(sorted[0].current_streak).toBe(10);
    expect(sorted[1].current_streak).toBe(8);
    expect(sorted[2].current_streak).toBe(5);
  });

  it('powinien sortowac po kartach w tym tygodniu', async () => {
    await component.loadLeaderboard();
    component.activeCategory.set('cards_this_week');
    const sorted = component.sortedEntries();

    expect(sorted[0].cards_this_week).toBe(30);
    expect(sorted[1].cards_this_week).toBe(15);
    expect(sorted[2].cards_this_week).toBe(5);
  });

  it('powinien sortowac po lacznych kartach', async () => {
    await component.loadLeaderboard();
    component.activeCategory.set('total_cards');
    const sorted = component.sortedEntries();

    expect(sorted[0].total_cards_reviewed).toBe(300);
    expect(sorted[1].total_cards_reviewed).toBe(200);
    expect(sorted[2].total_cards_reviewed).toBe(100);
  });

  it('powinien zwracac wartosc dla aktywnej kategorii', async () => {
    await component.loadLeaderboard();
    const entry = mockEntries[0];

    component.activeCategory.set('streak');
    expect(component.getValueForCategory(entry)).toBe(10);

    component.activeCategory.set('cards_this_week');
    expect(component.getValueForCategory(entry)).toBe(15);

    component.activeCategory.set('total_cards');
    expect(component.getValueForCategory(entry)).toBe(200);
  });

  it('powinien pokazac empty state gdy tylko 1 wpis', async () => {
    friendshipServiceMock.getLeaderboard.and.returnValue(Promise.resolve([mockEntries[0]]));
    await component.loadLeaderboard();

    expect(component.sortedEntries().length).toBe(1);
  });
});
