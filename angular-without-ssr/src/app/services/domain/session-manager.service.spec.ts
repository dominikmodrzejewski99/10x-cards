import { TestBed } from '@angular/core/testing';
import { SessionManager } from './session-manager.service';
import { Session, Message } from '../../interfaces/openrouter.interface';

describe('SessionManager', () => {
  let service: SessionManager;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionManager]
    });
    service = TestBed.inject(SessionManager);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createSession', () => {
    it('should create a new session with empty messages', () => {
      const session: Session = service.createSession();

      expect(session.id).toBeTruthy();
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should set the created session as active', () => {
      const session: Session = service.createSession();
      const retrieved: Session | null = service.getSession();

      expect(retrieved).toBe(session);
    });

    it('should create unique session IDs', () => {
      const session1: Session = service.createSession();
      const session2: Session = service.createSession();

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('getSession', () => {
    it('should return null when no sessions exist and no id provided', () => {
      const result: Session | null = service.getSession();

      expect(result).toBeNull();
    });

    it('should return null for non-existent session id', () => {
      const result: Session | null = service.getSession('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return session by explicit id', () => {
      const session: Session = service.createSession();
      const retrieved: Session | null = service.getSession(session.id);

      expect(retrieved).toBe(session);
    });

    it('should return active session when no id is provided', () => {
      const session: Session = service.createSession();
      const retrieved: Session | null = service.getSession();

      expect(retrieved).toBe(session);
    });

    it('should return the latest created session as active', () => {
      service.createSession();
      const session2: Session = service.createSession();
      const retrieved: Session | null = service.getSession();

      expect(retrieved).toBe(session2);
    });
  });

  describe('addMessage', () => {
    it('should add a message to an existing session', () => {
      const session: Session = service.createSession();
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      const updated: Session | null = service.addMessage(session.id, message);

      expect(updated).not.toBeNull();
      expect(updated!.messages.length).toBe(1);
      expect(updated!.messages[0]).toBe(message);
    });

    it('should update the updatedAt timestamp', () => {
      const session: Session = service.createSession();
      const originalUpdatedAt: Date = session.updatedAt;
      const message: Message = {
        role: 'assistant',
        content: 'Hi there',
        timestamp: new Date()
      };

      // Small delay to ensure timestamp difference
      const updated: Session | null = service.addMessage(session.id, message);

      expect(updated).not.toBeNull();
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should return null for non-existent session', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      const result: Session | null = service.addMessage('non-existent', message);

      expect(result).toBeNull();
    });

    it('should accumulate multiple messages', () => {
      const session: Session = service.createSession();
      const msg1: Message = { role: 'user', content: 'First', timestamp: new Date() };
      const msg2: Message = { role: 'assistant', content: 'Second', timestamp: new Date() };

      service.addMessage(session.id, msg1);
      service.addMessage(session.id, msg2);

      const retrieved: Session | null = service.getSession(session.id);
      expect(retrieved!.messages.length).toBe(2);
    });
  });

  describe('removeSession', () => {
    it('should remove an existing session and return true', () => {
      const session: Session = service.createSession();
      const result: boolean = service.removeSession(session.id);

      expect(result).toBe(true);
      expect(service.getSession(session.id)).toBeNull();
    });

    it('should return false for non-existent session', () => {
      const result: boolean = service.removeSession('non-existent');

      expect(result).toBe(false);
    });

    it('should reset activeSessionId when removing active session', () => {
      const session: Session = service.createSession();
      service.removeSession(session.id);

      expect(service.getSession()).toBeNull();
    });

    it('should not reset activeSessionId when removing non-active session', () => {
      const session1: Session = service.createSession();
      const session2: Session = service.createSession();
      // session2 is now active
      service.removeSession(session1.id);

      expect(service.getSession()).toBe(session2);
    });
  });
});
