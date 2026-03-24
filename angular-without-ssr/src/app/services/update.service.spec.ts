import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject, of } from 'rxjs';
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

    const appRefMock: jasmine.SpyObj<ApplicationRef> = jasmine.createSpyObj<ApplicationRef>(
      'ApplicationRef',
      [],
      { isStable: of(true) }
    );

    TestBed.configureTestingModule({
      providers: [
        UpdateService,
        { provide: SwUpdate, useValue: swUpdateMock },
        { provide: ApplicationRef, useValue: appRefMock }
      ]
    });

    service = TestBed.inject(UpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check for updates when enabled', () => {
    service.checkForUpdates();
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
        { provide: ApplicationRef, useValue: { isStable: of(true) } }
      ]
    });

    const disabledService: UpdateService = TestBed.inject(UpdateService);
    disabledService.checkForUpdates();
    expect(disabledSwUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('should reload page when user confirms update', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const reloadSpy: jasmine.Spy = spyOn(document.location, 'reload');

    service.checkForUpdates();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' }
    } as VersionReadyEvent);

    expect(window.confirm).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should not reload page when user declines update', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const reloadSpy: jasmine.Spy = spyOn(document.location, 'reload');

    service.checkForUpdates();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'abc123' },
      latestVersion: { hash: 'def456' }
    } as VersionReadyEvent);

    expect(window.confirm).toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
