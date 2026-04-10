import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ShareToFriendDialogComponent } from './share-to-friend-dialog.component';
import { FriendsFacadeService } from '../../services/friends-facade.service';

@Component({
  imports: [ShareToFriendDialogComponent],
  template: `
    <app-share-to-friend-dialog
      [setId]="42"
      [visible]="visible"
      (visibleChange)="visible = $event">
    </app-share-to-friend-dialog>
  `,
})
class TestHostComponent {
  visible = false;
}

describe('ShareToFriendDialogComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let component: ShareToFriendDialogComponent;

  const facadeMock: Record<string, jasmine.Spy> = {
    shareFriendsSignal: jasmine.createSpy('shareFriendsSignal').and.returnValue([]),
    shareLoadingSignal: jasmine.createSpy('shareLoadingSignal').and.returnValue(false),
    sharedToSignal: jasmine.createSpy('sharedToSignal').and.returnValue(new Set()),
    sharingSignal: jasmine.createSpy('sharingSignal').and.returnValue(null),

    loadShareFriends: jasmine.createSpy('loadShareFriends'),
    shareToFriend: jasmine.createSpy('shareToFriend'),
    isShared: jasmine.createSpy('isShared').and.returnValue(false),
    resetShareState: jasmine.createSpy('resetShareState'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        ShareToFriendDialogComponent,
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

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();
    component = hostFixture.debugElement.children[0].componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delegate shareToFriend to facade with setId and friendUserId', () => {
    component.shareToFriend('u1');

    expect(facadeMock['shareToFriend']).toHaveBeenCalledWith(42, 'u1');
  });

  it('should delegate isShared to facade', () => {
    facadeMock['isShared'].and.returnValue(true);

    expect(component.isShared('u1')).toBeTrue();
    expect(facadeMock['isShared']).toHaveBeenCalledWith('u1');
  });

  it('should call facade.resetShareState and emit visibleChange on close', () => {
    spyOn(component.visibleChange, 'emit');

    component.close();

    expect(facadeMock['resetShareState']).toHaveBeenCalled();
    expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
  });
});
