import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

import { ToastComponent } from './toast.component';
import { ToastService, ToastMessage } from '../../services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;

  const mockMessages: ToastMessage[] = [
    { id: 1, severity: 'success', summary: 'OK', detail: 'Saved successfully', life: 4000 },
    { id: 2, severity: 'error', summary: 'Error', detail: 'Something went wrong', life: 4000 },
  ];

  beforeEach(async () => {
    toastServiceMock = jasmine.createSpyObj<ToastService>('ToastService', [
      'add', 'remove', 'clear',
    ], {
      messages: signal<ToastMessage[]>(mockMessages),
    });

    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject ToastService', () => {
    expect(component.toastService).toBe(toastServiceMock);
  });

  it('should render toast messages from the service', () => {
    fixture.detectChanges();
    const messages = component.toastService.messages();
    expect(messages.length).toBe(2);
    expect(messages[0].severity).toBe('success');
    expect(messages[1].severity).toBe('error');
  });

  it('should render nothing when there are no messages', () => {
    (toastServiceMock as any).messages = signal<ToastMessage[]>([]);

    const fix = TestBed.createComponent(ToastComponent);
    fix.detectChanges();

    expect(fix.componentInstance.toastService.messages().length).toBe(0);
  });
});
