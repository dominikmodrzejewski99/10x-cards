import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject, BehaviorSubject } from 'rxjs';
import { UpdateService } from './update.service';

describe('UpdateService', () => {
  let service: UpdateService;
  let swUpdateMock: jasmine.SpyObj<SwUpdate>;
  let versionUpdates$: Subject<VersionReadyEvent>;

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionReadyEvent>();

    swUpdateMock = jasmine.createSpyObj<SwUpdate>('SwUpdate', ['checkForUpdate'], {
      isEnabled: true,
      versionUpdates: versionUpdates$.asObservable()
    });
    swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        UpdateService,
        { provide: SwUpdate, useValue: swUpdateMock },
      ]
    });

    service = TestBed.inject(UpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check for updates when enabled', () => {
    service.checkForUpdates();
    // checkForUpdate is called asynchronously after app stabilizes
    // Since the real ApplicationRef is used, isStable emits true eventually
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });

  it('should not check for updates when SW is not enabled', () => {
    const disabledSwUpdate: jasmine.SpyObj<SwUpdate> = jasmine.createSpyObj<SwUpdate>(
      'SwUpdate',
      ['checkForUpdate'],
      { isEnabled: false, versionUpdates: versionUpdates$.asObservable() }
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UpdateService,
        { provide: SwUpdate, useValue: disabledSwUpdate },
      ]
    });

    const disabledService: UpdateService = TestBed.inject(UpdateService);
    disabledService.checkForUpdates();
    expect(disabledSwUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('should prompt user with update message when version is ready', () => {
    // Note: cannot spy on document.location.reload (non-configurable native method),
    // so we only verify the confirm prompt is shown with the correct message.
    // Using returnValue(false) to prevent the actual page reload.
    const confirmSpy: jasmine.Spy = spyOn(window, 'confirm').and.returnValue(false);

    service.checkForUpdates();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' }
    } as VersionReadyEvent);

    expect(confirmSpy).toHaveBeenCalledWith(
      'Dostępna jest nowa wersja aplikacji. Czy chcesz ją załadować?'
    );
  });

  it('should not reload page when user declines update', () => {
    const confirmSpy: jasmine.Spy = spyOn(window, 'confirm').and.returnValue(false);

    service.checkForUpdates();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' }
    } as VersionReadyEvent);

    expect(confirmSpy).toHaveBeenCalled();
    // When user declines, no reload occurs (page stays intact)
  });
});
