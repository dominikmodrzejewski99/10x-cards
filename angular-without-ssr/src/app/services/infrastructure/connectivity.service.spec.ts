import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  let service: ConnectivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConnectivityService]
    });
    service = TestBed.inject(ConnectivityService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize onlineSignal with navigator.onLine value', () => {
    expect(service.onlineSignal()).toBe(navigator.onLine);
  });

  it('should set onlineSignal to true on online event', () => {
    service.onlineSignal.set(false);
    window.dispatchEvent(new Event('online'));
    expect(service.onlineSignal()).toBeTrue();
  });

  it('should set onlineSignal to false on offline event', () => {
    service.onlineSignal.set(true);
    window.dispatchEvent(new Event('offline'));
    expect(service.onlineSignal()).toBeFalse();
  });
});
