import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AuthService } from './auth.service';
import { SupabaseClientFactory } from '../services/infrastructure/supabase-client.factory';
import { UserDTO } from '../../types';

/**
 * Helper to build a mock SupabaseClient with chainable query builder.
 */
function createMockSupabaseClient(): {
  auth: jasmine.SpyObj<{
    signUp: jasmine.Spy;
    signInWithPassword: jasmine.Spy;
    signInAnonymously: jasmine.Spy;
    signOut: jasmine.Spy;
    getSession: jasmine.Spy;
    resetPasswordForEmail: jasmine.Spy;
    updateUser: jasmine.Spy;
  }>;
  from: jasmine.Spy;
  rpc: jasmine.Spy;
} {
  return {
    auth: jasmine.createSpyObj('auth', [
      'signUp',
      'signInWithPassword',
      'signInAnonymously',
      'signOut',
      'getSession',
      'resetPasswordForEmail',
      'updateUser',
    ]),
    from: jasmine.createSpy('from'),
    rpc: jasmine.createSpy('rpc'),
  };
}

type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

function buildQueryChain(resolvedValue: unknown): { select: jasmine.Spy; eq: jasmine.Spy; single: jasmine.Spy } {
  const chain: { select: jasmine.Spy; eq: jasmine.Spy; single: jasmine.Spy } = {
    select: jasmine.createSpy('select'),
    eq: jasmine.createSpy('eq'),
    single: jasmine.createSpy('single'),
  };
  chain.select.and.returnValue(chain);
  chain.eq.and.returnValue(chain);
  // single() returns a promise-like (thenable) for `from(...)`
  chain.single.and.returnValue(Promise.resolve(resolvedValue));
  return chain;
}

describe('AuthService', () => {
  let service: AuthService;
  let mockSupabase: MockSupabaseClient;
  let factorySpy: jasmine.SpyObj<SupabaseClientFactory>;

  const mockUser: UserDTO = {
    id: 'user-123',
    email: 'test@example.com',
    is_anonymous: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient();
    factorySpy = jasmine.createSpyObj<SupabaseClientFactory>('SupabaseClientFactory', ['getClient']);
    factorySpy.getClient.and.returnValue(mockSupabase as unknown as import('@supabase/supabase-js').SupabaseClient);

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            pl: {
              auth: {
                errors: {
                  invalidCredentials: 'Nieprawidłowy email lub hasło.',
                  userAlreadyRegistered: 'Użytkownik o podanym adresie email już istnieje. Spróbuj się zalogować.',
                  passwordTooShort: 'Hasło powinno mieć co najmniej 6 znaków.',
                  samePassword: 'Nowe hasło musi być inne niż obecne hasło.',
                  sessionExpired: 'Sesja wygasła. Spróbuj ponownie zresetować hasło.',
                  rateLimited: 'Ze względów bezpieczeństwa możesz wysłać prośbę raz na 60 sekund.',
                  emailNotConfirmed: 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.',
                  invalidEmailFormat: 'Nieprawidłowy format adresu email.',
                  invalidEmailAddress: 'Podany adres email jest nieprawidłowy. Użyj poprawnego adresu email.',
                  genericError: 'Wystąpił błąd. Spróbuj ponownie później.',
                  unknownError: 'Wystąpił nieznany błąd.',
                  networkError: 'Błąd sieci. Sprawdź połączenie z internetem.',
                  registrationFailed: 'Nie udało się zarejestrować. Spróbuj ponownie.',
                  loginFailed: 'Nie udało się zalogować. Spróbuj ponownie.',
                  anonymousAccountFailed: 'Nie udało się utworzyć konta testowego.',
                  updatePasswordFailed: 'Nie udało się zaktualizować hasła.',
                },
              },
            },
          },
          preloadLangs: true,
          translocoConfig: {
            availableLangs: ['pl'],
            defaultLang: 'pl',
          },
        }),
      ],
      providers: [
        AuthService,
        { provide: SupabaseClientFactory, useValue: factorySpy },
      ],
    }).compileComponents();

    service = TestBed.inject(AuthService);
  });

  describe('login', () => {
    it('should return a UserDTO on successful login', (done: DoneFn) => {
      const supabaseUser = {
        id: mockUser.id,
        email: mockUser.email,
        is_anonymous: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      };

      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: supabaseUser }, error: null })
      );

      // createUserRecord check: user already exists
      const chain = buildQueryChain({ data: supabaseUser, error: null });
      mockSupabase.from.and.returnValue(chain);

      service.login({ email: 'test@example.com', password: 'password123' }).subscribe({
        next: (user: UserDTO) => {
          expect(user.id).toBe(mockUser.id);
          expect(user.email).toBe(mockUser.email);
          expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123',
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should throw a mapped error on invalid credentials', (done: DoneFn) => {
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'Invalid login credentials' } })
      );

      service.login({ email: 'test@example.com', password: 'wrong' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('Nieprawidłowy email lub hasło');
          done();
        },
      });
    });
  });

  describe('register', () => {
    it('should register a user then auto-login', (done: DoneFn) => {
      const supabaseUser = {
        id: mockUser.id,
        email: mockUser.email,
        is_anonymous: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      };

      mockSupabase.auth.signUp.and.returnValue(
        Promise.resolve({ data: { user: supabaseUser }, error: null })
      );

      // createUserRecord: user already exists
      const chain = buildQueryChain({ data: supabaseUser, error: null });
      mockSupabase.from.and.returnValue(chain);

      // Auto-login after register
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: supabaseUser }, error: null })
      );

      service.register({ email: 'test@example.com', password: 'password123' }).subscribe({
        next: (user: UserDTO) => {
          expect(user.id).toBe(mockUser.id);
          expect(mockSupabase.auth.signUp).toHaveBeenCalled();
          expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw a mapped error when user already registered', (done: DoneFn) => {
      mockSupabase.auth.signUp.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'User already registered' } })
      );

      service.register({ email: 'test@example.com', password: 'pass123' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('Użytkownik o podanym adresie email już istnieje');
          done();
        },
      });
    });
  });

  describe('logout', () => {
    it('should call signOut and complete', (done: DoneFn) => {
      mockSupabase.auth.signOut.and.returnValue(
        Promise.resolve({ error: null })
      );

      service.logout().subscribe({
        next: () => {
          expect(mockSupabase.auth.signOut).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw a mapped error on signOut failure', (done: DoneFn) => {
      mockSupabase.auth.signOut.and.returnValue(
        Promise.resolve({ error: { message: 'Auth session missing!' } })
      );

      service.logout().subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('Sesja wygasła');
          done();
        },
      });
    });
  });

  describe('deleteAccount', () => {
    it('should call rpc and then signOut', (done: DoneFn) => {
      mockSupabase.rpc.and.returnValue(Promise.resolve({ error: null }));
      mockSupabase.auth.signOut.and.returnValue(Promise.resolve({ error: null }));

      service.deleteAccount().subscribe({
        next: () => {
          expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_user_account');
          expect(mockSupabase.auth.signOut).toHaveBeenCalled();
          done();
        },
        error: done.fail,
      });
    });

    it('should throw error when rpc fails', (done: DoneFn) => {
      mockSupabase.rpc.and.returnValue(Promise.resolve({ error: { message: 'RPC error' } }));

      service.deleteAccount().subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('Wystąpił błąd. Spróbuj ponownie później.');
          done();
        },
      });
    });
  });

  describe('resetPassword', () => {
    it('should call resetPasswordForEmail with redirect URL', (done: DoneFn) => {
      mockSupabase.auth.resetPasswordForEmail.and.returnValue(
        Promise.resolve({ error: null })
      );

      service.resetPassword('test@example.com').subscribe({
        next: () => {
          expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
            'test@example.com',
            jasmine.objectContaining({ redirectTo: jasmine.stringContaining('/reset-password') })
          );
          done();
        },
        error: done.fail,
      });
    });

    it('should throw rate limit error', (done: DoneFn) => {
      mockSupabase.auth.resetPasswordForEmail.and.returnValue(
        Promise.resolve({ error: { message: 'For security purposes, you can only request this once every 60 seconds' } })
      );

      service.resetPassword('test@example.com').subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('raz na 60 sekund');
          done();
        },
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return UserDTO when session exists', (done: DoneFn) => {
      const supabaseUser = {
        id: mockUser.id,
        email: mockUser.email,
        is_anonymous: false,
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at,
      };

      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: { user: supabaseUser } }, error: null })
      );

      service.getCurrentUser().subscribe({
        next: (user: UserDTO | null) => {
          expect(user).toBeTruthy();
          expect(user!.id).toBe(mockUser.id);
          done();
        },
        error: done.fail,
      });
    });

    it('should return null when no session', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );

      service.getCurrentUser().subscribe({
        next: (user: UserDTO | null) => {
          expect(user).toBeNull();
          done();
        },
        error: done.fail,
      });
    });

    it('should return null on error', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: { message: 'Network error' } })
      );

      service.getCurrentUser().subscribe({
        next: (user: UserDTO | null) => {
          expect(user).toBeNull();
          done();
        },
        error: done.fail,
      });
    });
  });

  describe('handleAuthError', () => {
    it('should map "Password should be at least 6 characters" to Polish message', (done: DoneFn) => {
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'Password should be at least 6 characters' } })
      );

      service.login({ email: 'a@b.com', password: '123' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('co najmniej 6 znaków');
          done();
        },
      });
    });

    it('should map "New password should be different from the old password." to Polish message', (done: DoneFn) => {
      mockSupabase.auth.updateUser.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'New password should be different from the old password.' } })
      );

      service.updatePassword('same-pass').subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('Nowe hasło musi być inne');
          done();
        },
      });
    });

    it('should return empty message for email not confirmed errors', (done: DoneFn) => {
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'Email not confirmed' } })
      );

      service.login({ email: 'a@b.com', password: 'pass123' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('potwierdzony');
          done();
        },
      });
    });

    it('should map invalid email format error', (done: DoneFn) => {
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'Unable to validate email address: invalid format' } })
      );

      service.login({ email: 'bad', password: 'pass123' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('Nieprawidłowy format');
          done();
        },
      });
    });

    it('should map "Email address ... is invalid" to Polish message', (done: DoneFn) => {
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: null }, error: { message: 'Email address foo@bar is invalid' } })
      );

      service.login({ email: 'foo@bar', password: 'pass123' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toContain('Podany adres email jest nieprawidłowy');
          done();
        },
      });
    });

    it('should pass through string errors directly', (done: DoneFn) => {
      mockSupabase.auth.signInWithPassword.and.returnValue(
        Promise.resolve({ data: { user: null }, error: 'Some string error' })
      );

      service.login({ email: 'a@b.com', password: 'pass123' }).subscribe({
        next: () => done.fail('Expected error'),
        error: (err: Error) => {
          expect(err.message).toBe('Some string error');
          done();
        },
      });
    });
  });
});
