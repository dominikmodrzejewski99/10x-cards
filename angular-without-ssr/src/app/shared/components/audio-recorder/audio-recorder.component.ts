import {
  Component, ChangeDetectionStrategy, input, output, InputSignal,
  OutputEmitterRef, WritableSignal, signal, OnDestroy, OnInit
} from '@angular/core';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';

@Component({
  selector: 'app-audio-recorder',
  imports: [AudioPlayerComponent],
  templateUrl: './audio-recorder.component.html',
  styleUrls: ['./audio-recorder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AudioRecorderComponent implements OnDestroy, OnInit {
  public maxDurationSignal: InputSignal<number> = input<number>(30, { alias: 'maxDuration' });
  public disabledSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'disabled' });
  public autoStartSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'autoStart' });

  public audioRecorded: OutputEmitterRef<File> = output<File>();
  public cancelled: OutputEmitterRef<void> = output<void>();

  public recordingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public elapsedSignal: WritableSignal<number> = signal<number>(0);
  public previewUrlSignal: WritableSignal<string | null> = signal<string | null>(null);
  public errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  public ngOnInit(): void {
    if (this.autoStartSignal()) {
      this.startRecording();
    }
  }

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private stream: MediaStream | null = null;

  public async startRecording(): Promise<void> {
    if (this.recordingSignal()) return;
    this.errorSignal.set(null);
    this.previewUrlSignal.set(null);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.errorSignal.set('Brak dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.');
      return;
    }

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm;codecs=opus' });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.stopStream();
      const blob: Blob = new Blob(this.chunks, { type: 'audio/webm' });

      if (this.elapsedSignal() < 1) {
        this.elapsedSignal.set(0);
        return;
      }

      const file: File = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      const url: string = URL.createObjectURL(blob);
      this.previewUrlSignal.set(url);
      this.audioRecorded.emit(file);
    };

    this.mediaRecorder.start();
    this.recordingSignal.set(true);
    this.elapsedSignal.set(0);

    this.timerInterval = setInterval(() => {
      const next: number = this.elapsedSignal() + 1;
      this.elapsedSignal.set(next);
      if (next >= this.maxDurationSignal()) {
        this.stopRecording();
      }
    }, 1000);
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.recordingSignal.set(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public discardRecording(): void {
    const url: string | null = this.previewUrlSignal();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrlSignal.set(null);
    this.elapsedSignal.set(0);
  }

  public ngOnDestroy(): void {
    this.stopRecording();
    this.stopStream();
    const url: string | null = this.previewUrlSignal();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }

  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      this.stream = null;
    }
  }
}
