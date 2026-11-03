import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputPasswordComponent } from './input-password.component';

describe('InputPasswordComponent', () => {
  let fixture: ComponentFixture<InputPasswordComponent>;
  let component: InputPasswordComponent;
  let input: HTMLInputElement;
  let boton: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InputPasswordComponent] }).compileComponents();

    fixture = TestBed.createComponent(InputPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  });

  it('oculta y muestra la contrasena con atributos ARIA', () => {
    expect(input.type).toBe('password');
    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('false');

    boton.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('true');

    boton.click();
    fixture.detectChanges();

    expect(input.type).toBe('password');
  });

  it('escribe el valor y respeta autocomplete', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);
    fixture.componentRef.setInput('autocomplete', 'new-password');
    fixture.detectChanges();

    input.value = 'secreto';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(cambios).toHaveBeenLastCalledWith('secreto');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
  });

  it('usa current-password por defecto y respeta disabled', () => {
    expect(input.getAttribute('autocomplete')).toBe('current-password');

    component.setDisabledState(true);
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
    expect(boton.disabled).toBe(true);
  });
});
