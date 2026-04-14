import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmService, ConfirmConfig } from '../../services/confirm.service';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let confirmServiceMock: jasmine.SpyObj<ConfirmService>;
  let overlayMock: jasmine.SpyObj<Overlay>;
  let overlayRefMock: jasmine.SpyObj<OverlayRef>;

  beforeEach(async () => {
    const backdropSubject = new Subject<MouseEvent>();
    const keydownSubject = new Subject<KeyboardEvent>();

    overlayRefMock = jasmine.createSpyObj<OverlayRef>('OverlayRef', [
      'attach', 'dispose', 'backdropClick', 'keydownEvents',
    ]);
    overlayRefMock.backdropClick.and.returnValue(backdropSubject.asObservable());
    overlayRefMock.keydownEvents.and.returnValue(keydownSubject.asObservable());

    const positionStrategyMock = {
      global: jasmine.createSpy('global').and.returnValue({
        centerHorizontally: jasmine.createSpy('centerHorizontally').and.returnValue({
          centerVertically: jasmine.createSpy('centerVertically').and.returnValue({}),
        }),
      }),
    };

    overlayMock = jasmine.createSpyObj<Overlay>('Overlay', ['create', 'position']);
    overlayMock.create.and.returnValue(overlayRefMock);
    overlayMock.position.and.returnValue(positionStrategyMock as any);
    (overlayMock as any).scrollStrategies = {
      block: jasmine.createSpy('block').and.returnValue({}),
    };

    confirmServiceMock = jasmine.createSpyObj<ConfirmService>('ConfirmService', [
      'confirm', 'accept', 'reject',
    ], {
      active: signal<(ConfirmConfig & { resolve: (value: boolean) => void }) | null>(null),
    });

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, OverlayModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ConfirmService, useValue: confirmServiceMock },
        { provide: Overlay, useValue: overlayMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject ConfirmService', () => {
    expect(component.confirmService).toBe(confirmServiceMock);
  });

  it('should not open overlay when no active confirmation', () => {
    fixture.detectChanges();
    expect(overlayMock.create).not.toHaveBeenCalled();
  });

  it('should dispose overlay on destroy', () => {
    component.ngOnDestroy();
    // Should not throw even when no overlay is open
    expect(component).toBeTruthy();
  });
});
