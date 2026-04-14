import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpinnerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SpinnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default size of 40px', () => {
    expect(component.size()).toBe('40px');
  });

  it('should accept custom size input', () => {
    fixture.componentRef.setInput('size', '24px');
    fixture.detectChanges();
    expect(component.size()).toBe('24px');
  });

  it('should render a spinner div with the correct size', () => {
    fixture.detectChanges();
    const spinnerEl: HTMLElement = fixture.nativeElement.querySelector('.spinner');
    expect(spinnerEl).toBeTruthy();
    expect(spinnerEl.style.width).toBe('40px');
    expect(spinnerEl.style.height).toBe('40px');
  });
});
