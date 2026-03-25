import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ConnectivityService } from '../../../services/connectivity.service';
import { OfflineQueueService } from '../../../services/offline-queue.service';

@Component({
  selector: 'app-sync-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sync-status.component.html',
  styleUrls: ['./sync-status.component.scss']
})
export class SyncStatusComponent {
  public connectivity: ConnectivityService = inject(ConnectivityService);
  public offlineQueue: OfflineQueueService = inject(OfflineQueueService);
}
