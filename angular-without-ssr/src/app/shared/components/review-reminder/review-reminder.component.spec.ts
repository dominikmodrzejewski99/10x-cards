import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ReviewReminderComponent } from './review-reminder.component';

@Component({
  template: `
    <app-review-reminder
      [visible]="visible()"
      [dueCount]="dueCount()"
      (study)="onStudy()"
      (dismiss)="onDismiss()">
    </app-review-reminder>
  `,
  imports: [ReviewReminderComponent],
})
class TestHostComponent {
  public visible: WritableSignal<boolean> = signal<boolean>(false);
  public dueCount: WritableSignal<number> = signal<number>(5);
  public studyCalled: boolean = false;
  public dismissCalled: boolean = false;

  public onStudy(): void {
    this.studyCalled = true;
  }

  public onDismiss(): void {
    this.dismissCalled = true;
  }
}

describe('ReviewReminderComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let component: ReviewReminderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewReminderComponent, TestHostComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as ReviewReminderComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should receive visible input', () => {
    expect(component.visible()).toBeFalse();
    hostComponent.visible.set(true);
    fixture.detectChanges();
    expect(component.visible()).toBeTrue();
  });

  it('should receive dueCount input', () => {
    expect(component.dueCount()).toBe(5);
    hostComponent.dueCount.set(10);
    fixture.detectChanges();
    expect(component.dueCount()).toBe(10);
  });

  it('should sync dialogVisible with visible input via effect', () => {
    expect(component.dialogVisible()).toBeFalse();
    hostComponent.visible.set(true);
    fixture.detectChanges();
    // effect runs after CD
    TestBed.flushEffects();
    expect(component.dialogVisible()).toBeTrue();
  });

  it('should set dialogVisible to false and emit dismiss on onHide', () => {
    component.dialogVisible.set(true);
    component.onHide();
    expect(component.dialogVisible()).toBeFalse();
    expect(hostComponent.dismissCalled).toBeTrue();
  });

  it('should set dialogVisible to false and emit study on onStudy', () => {
    component.dialogVisible.set(true);
    component.onStudy();
    expect(component.dialogVisible()).toBeFalse();
    expect(hostComponent.studyCalled).toBeTrue();
  });

  it('should set dialogVisible to false and emit dismiss on onDismiss', () => {
    component.dialogVisible.set(true);
    component.onDismiss();
    expect(component.dialogVisible()).toBeFalse();
    expect(hostComponent.dismissCalled).toBeTrue();
  });

  it('should render p-dialog element', () => {
    const el: HTMLElement = fixture.nativeElement;
    const dialog: Element | null = el.querySelector('p-dialog');
    expect(dialog).toBeTruthy();
  });
});
