import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SetListComponent } from './set-list.component';
import { SetsFacadeService } from '../../services/facades/sets-facade.service';
import { ShareService } from '../../services/api/share.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { FlashcardSetDTO } from '../../../types';

describe('SetListComponent', () => {
  let component: SetListComponent;
  let fixture: ComponentFixture<SetListComponent>;
  let facadeMock: jasmine.SpyObj<SetsFacadeService>;
  let routerMock: jasmine.SpyObj<Router>;
  let confirmMock: jasmine.SpyObj<ConfirmService>;
  let shareServiceMock: jasmine.SpyObj<ShareService>;
  let toastMock: jasmine.SpyObj<ToastService>;

  const mockSet: FlashcardSetDTO = {
    id: 1, user_id: 'u1', name: 'Test Set', description: 'desc', tags: [],
    is_public: false, copy_count: 0, published_at: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    facadeMock = jasmine.createSpyObj<SetsFacadeService>(
      'SetsFacadeService',
      ['loadSets', 'createSet', 'updateSet', 'deleteSet', 'publishSet', 'unpublishSet'],
      {
        setsSignal: signal<FlashcardSetDTO[]>([mockSet]),
        loadingSignal: signal<boolean>(false),
        errorSignal: signal<string | null>(null),
        savingSignal: signal<boolean>(false),
      }
    );
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    confirmMock = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['confirm']);
    shareServiceMock = jasmine.createSpyObj<ShareService>('ShareService', ['createShareLink', 'buildShareUrl']);
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add']);

    await TestBed.configureTestingModule({
      imports: [
        SetListComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: SetsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
        { provide: ShareService, useValue: shareServiceMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call facade.loadSets on init', () => {
    fixture.detectChanges();
    expect(facadeMock.loadSets).toHaveBeenCalled();
  });

  describe('dialog management', () => {
    it('should open create dialog', () => {
      component.openCreateDialog();
      expect(component.dialogVisibleSignal).toBeTrue();
      expect(component.editingSetSignal).toBeNull();
    });

    it('should open edit dialog with set', () => {
      component.openEditDialog(mockSet);
      expect(component.dialogVisibleSignal).toBeTrue();
      expect(component.editingSetSignal).toEqual(mockSet);
    });

    it('should close dialog', () => {
      component.openCreateDialog();
      component.closeDialog();
      expect(component.dialogVisibleSignal).toBeFalse();
      expect(component.editingSetSignal).toBeNull();
    });
  });

  describe('onSave', () => {
    it('should call facade.createSet for new set', () => {
      component.openCreateDialog();
      component.onSave({ name: 'New', description: null, tags: [] });

      expect(facadeMock.createSet).toHaveBeenCalledWith({ name: 'New', description: null, tags: [] });
      expect(component.dialogVisibleSignal).toBeFalse();
    });

    it('should call facade.updateSet for existing set', () => {
      component.openEditDialog(mockSet);
      component.onSave({ name: 'Updated', description: 'new desc', tags: ['t'] });

      expect(facadeMock.updateSet).toHaveBeenCalledWith(1, { name: 'Updated', description: 'new desc', tags: ['t'] });
      expect(component.dialogVisibleSignal).toBeFalse();
    });
  });

  describe('onDelete', () => {
    it('should call facade.deleteSet after confirmation', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(true));

      await component.onDelete(mockSet);

      expect(confirmMock.confirm).toHaveBeenCalled();
      expect(facadeMock.deleteSet).toHaveBeenCalledWith(1);
    });

    it('should not delete when confirmation is rejected', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(false));

      await component.onDelete(mockSet);

      expect(facadeMock.deleteSet).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate to set', () => {
      component.navigateToSet(mockSet);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 1]);
    });

    it('should navigate to study', () => {
      component.studySet(mockSet);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/study'], { queryParams: { setId: 1 } });
    });

    it('should navigate to quiz', () => {
      component.quizSet(mockSet);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/quiz', 1]);
    });
  });

  describe('onPublish', () => {
    it('should call facade.publishSet after confirmation', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(true));

      await component.onPublish(mockSet);

      expect(facadeMock.publishSet).toHaveBeenCalledWith(1);
    });
  });

  describe('onUnpublish', () => {
    it('should call facade.unpublishSet after confirmation', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(true));

      await component.onUnpublish(mockSet);

      expect(facadeMock.unpublishSet).toHaveBeenCalledWith(1);
    });
  });
});
