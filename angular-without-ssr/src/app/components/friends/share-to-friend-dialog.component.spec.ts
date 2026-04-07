import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { ShareToFriendDialogComponent } from './share-to-friend-dialog.component';
import { FriendshipService } from '../../services/friendship.service';
import { FriendDTO } from '../../../types';
import { Component } from '@angular/core';

@Component({
  imports: [ShareToFriendDialogComponent],
  template: `
    <app-share-to-friend-dialog
      [setId]="42"
      [visible]="visible"
      (visibleChange)="visible = $event">
    </app-share-to-friend-dialog>
  `
})
class TestHostComponent {
  visible = false;
}

describe('ShareToFriendDialogComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let component: ShareToFriendDialogComponent;
  let friendshipServiceMock: jasmine.SpyObj<FriendshipService>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;

  const mockFriends: FriendDTO[] = [
    { friendship_id: 'f1', user_id: 'u1', email_masked: 'te...@test.com', current_streak: 5, last_study_date: null, last_active_at: null, total_cards_reviewed: 100 },
    { friendship_id: 'f2', user_id: 'u2', email_masked: 'jo...@test.com', current_streak: 3, last_study_date: null, last_active_at: null, total_cards_reviewed: 50 }
  ];

  beforeEach(async () => {
    friendshipServiceMock = jasmine.createSpyObj('FriendshipService', ['getFriends', 'shareDeckToFriend']);
    toastServiceMock = jasmine.createSpyObj('ToastService', ['add']);

    friendshipServiceMock.getFriends.and.returnValue(Promise.resolve(mockFriends));
    friendshipServiceMock.shareDeckToFriend.and.returnValue(Promise.resolve('share-id'));

    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        ShareToFriendDialogComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: FriendshipService, useValue: friendshipServiceMock },
        { provide: ToastService, useValue: toastServiceMock }
      ]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();
    component = hostFixture.debugElement.children[0].componentInstance;
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien zaladowac znajomych gdy dialog widoczny', async () => {
    hostFixture.componentInstance.visible = true;
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    expect(friendshipServiceMock.getFriends).toHaveBeenCalled();
    expect(component.friends().length).toBe(2);
  });

  it('powinien udostepnic talie znajomemu', async () => {
    component.friends.set(mockFriends);

    await component.shareToFriend('u1');

    expect(friendshipServiceMock.shareDeckToFriend).toHaveBeenCalledWith(42, 'u1');
    expect(component.isShared('u1')).toBeTrue();
    expect(toastServiceMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('powinien oznaczyc jako udostepnione po wyslaniu', async () => {
    component.friends.set(mockFriends);
    await component.shareToFriend('u1');

    expect(component.isShared('u1')).toBeTrue();
    expect(component.isShared('u2')).toBeFalse();
  });

  it('powinien obsluzyc blad udostepniania', async () => {
    friendshipServiceMock.shareDeckToFriend.and.returnValue(Promise.reject({ message: 'Not friends' }));
    component.friends.set(mockFriends);

    await component.shareToFriend('u1');

    expect(component.isShared('u1')).toBeFalse();
    expect(toastServiceMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
  });
});
