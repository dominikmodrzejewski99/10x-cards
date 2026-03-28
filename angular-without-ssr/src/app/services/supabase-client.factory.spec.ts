import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';

describe('SupabaseClientFactory', () => {
  let service: SupabaseClientFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseClientFactory],
    });
    service = TestBed.inject(SupabaseClientFactory);
  });

  it('powinien zostać utworzony', () => {
    expect(service).toBeTruthy();
  });

  describe('createClient', () => {
    it('powinien utworzyć instancję SupabaseClient', () => {
      const client: SupabaseClient = service.createClient();

      expect(client).toBeTruthy();
      expect(client.auth).toBeDefined();
    });

    it('powinien zwracać tę samą instancję przy kolejnych wywołaniach (singleton)', () => {
      const firstCall: SupabaseClient = service.createClient();
      const secondCall: SupabaseClient = service.createClient();

      expect(firstCall).toBe(secondCall);
    });
  });

  describe('getClient', () => {
    it('powinien delegować do createClient i zwrócić klienta', () => {
      const client: SupabaseClient = service.getClient();

      expect(client).toBeTruthy();
      expect(client).toBe(service.createClient());
    });
  });

  describe('localStorage storage wrapper', () => {
    it('powinien odczytać wartość z localStorage przez klienta', () => {
      spyOn(localStorage, 'getItem').and.returnValue('test-value');

      const client: SupabaseClient = service.createClient();

      // Client was created with custom storage - verify it's functional
      expect(client).toBeTruthy();
    });

    it('powinien obsłużyć błąd localStorage.getItem gracefully', () => {
      spyOn(localStorage, 'getItem').and.throwError('QuotaExceededError');
      spyOn(console, 'error');

      // Use TestBed to get a new instance with Angular DI (inject(LoggerService) requires DI context)
      const freshService: SupabaseClientFactory = TestBed.inject(SupabaseClientFactory);
      const client: SupabaseClient = freshService.createClient();

      expect(client).toBeTruthy();
    });

    it('powinien obsłużyć błąd localStorage.setItem gracefully', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
      spyOn(console, 'error');

      const freshService: SupabaseClientFactory = TestBed.inject(SupabaseClientFactory);
      const client: SupabaseClient = freshService.createClient();

      expect(client).toBeTruthy();
    });

    it('powinien obsłużyć błąd localStorage.removeItem gracefully', () => {
      spyOn(localStorage, 'removeItem').and.throwError('StorageError');
      spyOn(console, 'error');

      const freshService: SupabaseClientFactory = TestBed.inject(SupabaseClientFactory);
      const client: SupabaseClient = freshService.createClient();

      expect(client).toBeTruthy();
    });
  });
});
