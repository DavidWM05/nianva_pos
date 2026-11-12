import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { TwoFactorCodeInputComponent } from './two-factor-code-input.component';

// 50j: lo que hace el campo del codigo TOTP sin depender de la libreria que lo dibuja. Pasa
// igual con PrimeNG y despues. Lo usan la verificacion del login, Preferencias y el detalle de
// usuario.
describe('TwoFactorCodeInputComponent: comportamiento', () => {
  let fixture: ComponentFixture<TwoFactorCodeInputComponent>;
  let emitidos: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorCodeInputComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(TwoFactorCodeInputComponent);
    emitidos = [];
    fixture.componentInstance.codeSubmit.subscribe((codigo) => emitidos.push(codigo));
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]');
  const codigo = () => fixture.componentInstance['code'];
  const enviar = () => {
    el().querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };

  it('el boton lleva la etiqueta que pasa la pantalla', () => {
    fixture.componentRef.setInput('submitLabel', 'Confirmar cambio');
    fixture.detectChanges();

    expect(boton()?.textContent?.trim()).toBe('Confirmar cambio');
  });

  it('con menos de 6 digitos el boton esta deshabilitado y no emite', () => {
    codigo().setValue('12345');
    fixture.detectChanges();
    expect(boton()?.disabled).toBe(true);

    enviar();
    expect(emitidos).toEqual([]);
  });

  it('con 6 digitos se habilita y al enviar emite el codigo', () => {
    codigo().setValue('123456');
    fixture.detectChanges();
    expect(boton()?.disabled).toBe(false);

    enviar();
    expect(emitidos).toEqual(['123456']);
  });

  it('mientras la pantalla envia, el boton queda deshabilitado', () => {
    codigo().setValue('123456');
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(boton()?.disabled).toBe(true);
  });

  it('muestra el error que pasa la pantalla y limpiar() vacia el campo', () => {
    codigo().setValue('123456');
    fixture.componentRef.setInput('error', 'Código inválido.');
    fixture.detectChanges();
    expect(el().textContent).toContain('Código inválido.');

    fixture.componentInstance.limpiar();
    fixture.detectChanges();
    expect(codigo().value).toBe('');
    expect(boton()?.disabled).toBe(true);
  });
});
