import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ConnectivityService } from '../../../services/infrastructure/connectivity.service';
import { OfflineQueueService } from '../../../services/infrastructure/offline-queue.service';

@Component({
  selector: 'app-sync-status',
  imports: [TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sync-status.component.html',
  styleUrls: ['./sync-status.component.scss']
})
export class SyncStatusComponent {
  public connectivity: ConnectivityService = inject(ConnectivityService);
  public offlineQueue: OfflineQueueService = inject(OfflineQueueService);
}
