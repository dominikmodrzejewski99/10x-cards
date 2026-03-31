import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SyncStatusComponent } from './sync-status.component';
import { ConnectivityService } from '../../../services/connectivity.service';
import { OfflineQueueService } from '../../../services/offline-queue.service';

describe('SyncStatusComponent', () => {
  let component: SyncStatusComponent;
  let fixture: ComponentFixture<SyncStatusComponent>;
  let mockConnectivity: { onlineSignal: ReturnType<typeof signal<boolean>> };
  let mockOfflineQueue: {
    pendingCountSignal: ReturnType<typeof signal<number>>;
    syncingSignal: ReturnType<typeof signal<boolean>>;
    hasPendingSignal: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    mockConnectivity = {
      onlineSignal: signal<boolean>(true)
    };

    mockOfflineQueue = {
      pendingCountSignal: signal<number>(0),
      syncingSignal: signal<boolean>(false),
      hasPendingSignal: signal<boolean>(false)
    };

    await TestBed.configureTestingModule({
      imports: [SyncStatusComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      providers: [
        { provide: ConnectivityService, useValue: mockConnectivity },
        { provide: OfflineQueueService, useValue: mockOfflineQueue }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show nothing when online with no pending items', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.sync-status')).toBeNull();
  });

  it('should show offline indicator when offline', () => {
    mockConnectivity.onlineSignal.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const status: HTMLElement | null = el.querySelector('.sync-status');
    expect(status).toBeTruthy();
    expect(status!.textContent).toContain('syncStatus.offline');
  });

  it('should show pending count when items are queued', () => {
    mockOfflineQueue.pendingCountSignal.set(3);
    mockOfflineQueue.hasPendingSignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const status: HTMLElement | null = el.querySelector('.sync-status');
    expect(status).toBeTruthy();
    expect(status!.textContent).toContain('syncStatus.pending');
  });

  it('should show syncing indicator when syncing', () => {
    mockOfflineQueue.syncingSignal.set(true);
    mockOfflineQueue.hasPendingSignal.set(true);
    mockConnectivity.onlineSignal.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const status: HTMLElement | null = el.querySelector('.sync-status');
    expect(status).toBeTruthy();
    expect(status!.textContent).toContain('syncStatus.syncing');
  });
});
