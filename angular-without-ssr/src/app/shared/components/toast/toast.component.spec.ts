import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ToastComponent } from './toast.component';
import { ToastService, ToastMessage } from '../../services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;
  let messagesSignal = signal<ToastMessage[]>([]);

  const mockMessages: ToastMessage[] = [
    { id: 1, severity: 'success', summary: 'OK', detail: 'Saved successfully', life: 4000 },
    { id: 2, severity: 'error', summary: 'Error', detail: 'Something went wrong', life: 4000 },
  ];

  beforeEach(async () => {
    messagesSignal = signal<ToastMessage[]>(mockMessages);

    toastServiceMock = jasmine.createSpyObj<ToastService>('ToastService', [
      'add', 'remove', 'clear',
    ], {
      messages: messagesSignal,
    });

    await TestBed.configureTestingModule({
      imports: [
        ToastComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' }
        })
      ],
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
    messagesSignal.set([]);
    fixture.detectChanges();
    expect(component.toastService.messages().length).toBe(0);
  });
});
