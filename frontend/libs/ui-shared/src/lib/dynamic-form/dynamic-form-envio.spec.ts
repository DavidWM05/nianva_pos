import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DynamicFormComponent } from './dynamic-form.component';
import { DynamicFormField } from './dynamic-form.types';

// 50j: lo vio el e2e del login. "Las credenciales no son validas." llega como error del servidor
// en `correo`; corregir la contrasena y volver a enviar no hacia nada, porque el error del
// servidor seguia en `correo` hasta editar ese campo.
const CAMPOS: DynamicFormField[] = [
  { name: 'correo', label: 'Correo', type: 'text', required: true, validators: [Validators.email] },
  { name: 'password', label: 'Contraseña', type: 'password', required: true },
];

describe('DynamicFormComponent: envio', () => {
  let fixture: ComponentFixture<DynamicFormComponent>;
  let component: DynamicFormComponent;
  let emitidos: Record<string, unknown>[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    component.fields = CAMPOS;
    component.ngOnChanges();
    fixture.detectChanges();
    emitidos = [];
    component.formSubmit.subscribe((valor) => emitidos.push(valor));
    component.form.setValue({ correo: 'vendedor@abarrotes.test', password: 'equivocada' });
  });

  afterEach(() => vi.useRealTimers());

  const boton = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]');

  it('un error del servidor no impide reenviar: el siguiente envio vuelve a validar', () => {
    component.onSubmit();
    component.setServerErrors({ correo: ['Las credenciales no son validas.'] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Las credenciales no son validas.');

    component.form.get('password')?.setValue('la-correcta');
    component.onSubmit();
    fixture.detectChanges();

    expect(emitidos).toEqual([
      { correo: 'vendedor@abarrotes.test', password: 'equivocada' },
      { correo: 'vendedor@abarrotes.test', password: 'la-correcta' },
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Las credenciales no son validas.');
  });

  it('el reenvio sigue respetando las validaciones propias de cada campo', () => {
    component.setServerErrors({ correo: 'Las credenciales no son validas.' });
    component.form.get('correo')?.setValue('sin-arroba');
    component.onSubmit();
    fixture.detectChanges();

    expect(emitidos).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Correo invalido.');
  });

  it('con `enviando`, el boton queda deshabilitado con aria-busy y no se envia otra vez', () => {
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(boton()?.disabled).toBe(true);
    expect(boton()?.getAttribute('aria-busy')).toBe('true');

    component.onSubmit();
    expect(emitidos).toEqual([]);

    fixture.componentRef.setInput('enviando', false);
    fixture.detectChanges();
    expect(boton()?.disabled).toBe(false);
    expect(boton()?.getAttribute('aria-busy')).toBeNull();
  });

  it('cambiar `enviando` no rehace el formulario: conserva lo escrito y el error del servidor', () => {
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('enviando', false);
    component.setServerErrors({ correo: 'Las credenciales no son validas.' });
    fixture.detectChanges();

    expect(component.form.getRawValue()).toEqual({ correo: 'vendedor@abarrotes.test', password: 'equivocada' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Las credenciales no son validas.');
  });

  it('el indicador del boton aparece solo pasado el umbral (UI-18)', async () => {
    vi.useFakeTimers();
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();
    const indicador = () => boton()?.querySelector('.dynamic-form__indicador');

    await vi.advanceTimersByTimeAsync(299);
    fixture.detectChanges();
    expect(indicador()).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(indicador()?.getAttribute('aria-hidden')).toBe('true');
  });
});
