import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';

import { SetListComponent } from './set-list.component';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardSetDTO } from '../../../types';

describe('SetListComponent', () => {
  let component: SetListComponent;
  let fixture: ComponentFixture<SetListComponent>;

  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let messageServiceMock: jasmine.SpyObj<MessageService>;
  let confirmationServiceMock: jasmine.SpyObj<ConfirmationService>;
  let routerMock: jasmine.SpyObj<Router>;

  const mockSet: FlashcardSetDTO = {
    id: 1,
    user_id: 'user-1',
    name: 'English Basics',
    description: 'Basic English words',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };

  const mockSet2: FlashcardSetDTO = {
    id: 2,
    user_id: 'user-1',
    name: 'German Phrases',
    description: null,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z'
  };

  beforeEach(async () => {
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService',
      ['getSets', 'createSet', 'updateSet', 'deleteSet']
    );
    messageServiceMock = jasmine.createSpyObj<MessageService>('MessageService', ['add', 'clear']);
    (messageServiceMock as unknown as Record<string, unknown>)['messageObserver'] = new Subject<unknown>();
    (messageServiceMock as unknown as Record<string, unknown>)['clearObserver'] = new Subject<unknown>();

    confirmationServiceMock = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    (confirmationServiceMock as unknown as Record<string, unknown>)['requireConfirmation$'] = new Subject<Confirmation>();

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    setApiMock.getSets.and.returnValue(of([mockSet, mockSet2]));

    await TestBed.configureTestingModule({
      imports: [SetListComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} }
          }
        }
      ]
    })
    .overrideComponent(SetListComponent, {
      remove: { providers: [MessageService, ConfirmationService] },
      add: {
        providers: [
          { provide: MessageService, useValue: messageServiceMock },
          { provide: ConfirmationService, useValue: confirmationServiceMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load sets on init', () => {
      fixture.detectChanges();

      expect(setApiMock.getSets).toHaveBeenCalled();
      expect(component.state().sets.length).toBe(2);
      expect(component.state().loading).toBeFalse();
    });

    it('should handle error when loading sets fails', () => {
      setApiMock.getSets.and.returnValue(throwError(() => new Error('Network error')));

      fixture.detectChanges();

      expect(component.state().loading).toBeFalse();
      expect(component.state().error).toBe('Nie udało się załadować zestawów.');
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });
  });

  describe('createSet', () => {
    it('should create a set and add it to the list', () => {
      fixture.detectChanges();
      const createdSet: FlashcardSetDTO = {
        id: 3,
        user_id: 'user-1',
        name: 'New Set',
        description: null,
        created_at: '2026-01-03T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z'
      };
      setApiMock.createSet.and.returnValue(of(createdSet));

      component.openCreateDialog();
      component.onFormNameChange('New Set');
      component.saveSet();

      expect(setApiMock.createSet).toHaveBeenCalledWith(
        jasmine.objectContaining({ name: 'New Set' })
      );
      expect(component.state().sets.length).toBe(3);
      expect(component.state().sets[0]).toEqual(createdSet);
      expect(component.state().dialogVisible).toBeFalse();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success' })
      );
    });

    it('should handle error on create failure', () => {
      fixture.detectChanges();
      setApiMock.createSet.and.returnValue(throwError(() => new Error('Create failed')));

      component.openCreateDialog();
      component.onFormNameChange('New Set');
      component.saveSet();

      expect(component.state().formSaving).toBeFalse();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });
  });

  describe('editSet', () => {
    it('should update a set in the list', () => {
      fixture.detectChanges();
      const updatedSet: FlashcardSetDTO = { ...mockSet, name: 'Updated Name' };
      setApiMock.updateSet.and.returnValue(of(updatedSet));

      component.openEditDialog(mockSet);
      expect(component.state().editingSet).toEqual(mockSet);
      expect(component.state().formName).toBe('English Basics');

      component.onFormNameChange('Updated Name');
      component.saveSet();

      expect(setApiMock.updateSet).toHaveBeenCalledWith(1, jasmine.objectContaining({ name: 'Updated Name' }));
      expect(component.state().sets.find(s => s.id === 1)?.name).toBe('Updated Name');
      expect(component.state().dialogVisible).toBeFalse();
    });

    it('should handle error on update failure', () => {
      fixture.detectChanges();
      setApiMock.updateSet.and.returnValue(throwError(() => new Error('Update failed')));

      component.openEditDialog(mockSet);
      component.onFormNameChange('Updated Name');
      component.saveSet();

      expect(component.state().formSaving).toBeFalse();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });
  });

  describe('deleteSet', () => {
    it('should delete a set after confirmation', () => {
      fixture.detectChanges();
      setApiMock.deleteSet.and.returnValue(of(undefined));

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.deleteSet(mockSet);

      expect(confirmationServiceMock.confirm).toHaveBeenCalled();
      expect(setApiMock.deleteSet).toHaveBeenCalledWith(1);
      expect(component.state().sets.find(s => s.id === 1)).toBeUndefined();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success' })
      );
    });

    it('should handle error on delete failure', () => {
      fixture.detectChanges();
      setApiMock.deleteSet.and.returnValue(throwError(() => new Error('Delete failed')));

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.deleteSet(mockSet);

      expect(component.state().loading).toBeFalse();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });
  });

  describe('form validation', () => {
    it('should not save when form name is empty', () => {
      fixture.detectChanges();

      component.openCreateDialog();
      component.onFormNameChange('   ');
      component.saveSet();

      expect(setApiMock.createSet).not.toHaveBeenCalled();
    });

    it('should not save when form name is empty string', () => {
      fixture.detectChanges();

      component.openCreateDialog();
      component.saveSet();

      expect(setApiMock.createSet).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate to set detail', () => {
      fixture.detectChanges();

      component.navigateToSet(mockSet);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 1]);
    });

    it('should navigate to study with setId query param', () => {
      fixture.detectChanges();

      component.studySet(mockSet);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/study'], { queryParams: { setId: 1 } });
    });
  });
});
