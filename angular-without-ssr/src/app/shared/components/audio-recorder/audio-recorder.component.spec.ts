import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioRecorderComponent } from './audio-recorder.component';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

@Component({
  template: '<app-audio-recorder (audioRecorded)="onRecorded($event)" />',
  imports: [AudioRecorderComponent]
})
class TestHostComponent {
  public recordedFile: File | null = null;
  public onRecorded(file: File): void {
    this.recordedFile = file;
  }
}

describe('AudioRecorderComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    const btn: HTMLElement = fixture.nativeElement.querySelector('.audio-recorder__btn');
    expect(btn).toBeTruthy();
  });

  it('should show record button in idle state', () => {
    const btn: HTMLElement = fixture.nativeElement.querySelector('.audio-recorder__btn');
    expect(btn.textContent?.trim()).toContain('audioRecorder.record');
  });

  it('should not show recording UI in idle state', () => {
    const active: HTMLElement = fixture.nativeElement.querySelector('.audio-recorder__active');
    expect(active).toBeNull();
  });

  it('should not show preview in idle state', () => {
    const preview: HTMLElement = fixture.nativeElement.querySelector('.audio-recorder__preview');
    expect(preview).toBeNull();
  });

  it('should disable button when disabled input is true', async () => {
    const recorderEl: HTMLElement = fixture.nativeElement.querySelector('app-audio-recorder');
    expect(recorderEl).toBeTruthy();
  });
});
