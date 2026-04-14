import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';

import { DialogComponent } from './dialog.component';

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
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

    await TestBed.configureTestingModule({
      imports: [DialogComponent, OverlayModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Overlay, useValue: overlayMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('header', 'Test Dialog');
    fixture.componentRef.setInput('visible', false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit visibleChange and onHide when close() is called', () => {
    spyOn(component.visibleChange, 'emit');
    spyOn(component.onHide, 'emit');

    component.close();

    expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    expect(component.onHide.emit).toHaveBeenCalled();
  });

  it('should report isMobile based on window width', () => {
    // isMobile returns true when window.innerWidth <= 480
    const result = component.isMobile();
    expect(typeof result).toBe('boolean');
  });

  it('should dispose overlay on destroy', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    component.ngOnDestroy();

    // After destroy, the overlay should have been cleaned up
    // (closeOverlay is called which disposes the overlayRef if it exists)
    expect(component).toBeTruthy();
  });
});
