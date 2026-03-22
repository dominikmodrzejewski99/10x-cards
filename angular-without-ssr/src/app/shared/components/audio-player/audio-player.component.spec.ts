import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioPlayerComponent } from './audio-player.component';
import { Component } from '@angular/core';

@Component({
  template: '<app-audio-player [audioUrl]="url" [compact]="compact" />',
  imports: [AudioPlayerComponent]
})
class TestHostComponent {
  public url: string = 'https://example.com/audio.mp3';
  public compact: boolean = false;
}

describe('AudioPlayerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    const player: HTMLElement = fixture.nativeElement.querySelector('.audio-player');
    expect(player).toBeTruthy();
  });

  it('should render play button', () => {
    const btn: HTMLElement = fixture.nativeElement.querySelector('.audio-player__btn');
    expect(btn).toBeTruthy();
    const icon: HTMLElement = btn.querySelector('.pi-play')!;
    expect(icon).toBeTruthy();
  });

  it('should render progress bar', () => {
    const progress: HTMLElement = fixture.nativeElement.querySelector('.audio-player__progress');
    expect(progress).toBeTruthy();
  });

  it('should render time display', () => {
    const time: HTMLElement = fixture.nativeElement.querySelector('.audio-player__time');
    expect(time).toBeTruthy();
    expect(time.textContent?.trim()).toContain('0:00');
  });

  it('should apply compact class when compact input is true', () => {
    host.compact = true;
    fixture.detectChanges();
    const player: HTMLElement = fixture.nativeElement.querySelector('.audio-player');
    expect(player.classList.contains('audio-player--compact')).toBeTrue();
  });

  it('should not have compact class by default', () => {
    const player: HTMLElement = fixture.nativeElement.querySelector('.audio-player');
    expect(player.classList.contains('audio-player--compact')).toBeFalse();
  });

  it('should have audio element with correct src', () => {
    const audio: HTMLAudioElement = fixture.nativeElement.querySelector('audio');
    expect(audio.src).toBe('https://example.com/audio.mp3');
  });

  it('should show duration text in compact mode', () => {
    host.compact = true;
    fixture.detectChanges();
    const time: HTMLElement = fixture.nativeElement.querySelector('.audio-player__time');
    expect(time.textContent?.trim()).toBe('0:00');
  });
});
