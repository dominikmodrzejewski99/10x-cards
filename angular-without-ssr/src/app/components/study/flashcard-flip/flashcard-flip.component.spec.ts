import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FlashcardFlipComponent } from './flashcard-flip.component';

describe('FlashcardFlipComponent', () => {
  let component: FlashcardFlipComponent;
  let fixture: ComponentFixture<FlashcardFlipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlashcardFlipComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(FlashcardFlipComponent);
    component = fixture.componentInstance;

    // Set required inputs before detectChanges
    fixture.componentRef.setInput('front', 'hello');
    fixture.componentRef.setInput('back', 'cześć');
  });

  it('should be created', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should accept front text', () => {
      fixture.detectChanges();

      expect(component.frontSignal()).toBe('hello');
    });

    it('should accept back text', () => {
      fixture.detectChanges();

      expect(component.backSignal()).toBe('cześć');
    });

    it('should accept frontImageUrl as null by default', () => {
      fixture.detectChanges();

      expect(component.frontImageUrlSignal()).toBeNull();
    });

    it('should accept frontImageUrl when provided', () => {
      fixture.componentRef.setInput('frontImageUrl', 'http://img.png');
      fixture.detectChanges();

      expect(component.frontImageUrlSignal()).toBe('http://img.png');
    });

    it('should accept isFlipped as false by default', () => {
      fixture.detectChanges();

      expect(component.isFlippedSignal()).toBeFalse();
    });

    it('should accept isFlipped when set to true', () => {
      fixture.componentRef.setInput('isFlipped', true);
      fixture.detectChanges();

      expect(component.isFlippedSignal()).toBeTrue();
    });

    it('should accept skipTransition as false by default', () => {
      fixture.detectChanges();

      expect(component.skipTransitionSignal()).toBeFalse();
    });

    it('should accept skipTransition when set to true', () => {
      fixture.componentRef.setInput('skipTransition', true);
      fixture.detectChanges();

      expect(component.skipTransitionSignal()).toBeTrue();
    });

    it('should accept backAudioUrl as null by default', () => {
      fixture.detectChanges();

      expect(component.backAudioUrlSignal()).toBeNull();
    });

    it('should accept backAudioUrl when provided', () => {
      fixture.componentRef.setInput('backAudioUrl', 'http://audio.mp3');
      fixture.detectChanges();

      expect(component.backAudioUrlSignal()).toBe('http://audio.mp3');
    });
  });

  describe('onFlip', () => {
    it('should emit flipToggle event', () => {
      fixture.detectChanges();
      spyOn(component.flipToggle, 'emit');

      component.onFlip();

      expect(component.flipToggle.emit).toHaveBeenCalled();
    });
  });
});
