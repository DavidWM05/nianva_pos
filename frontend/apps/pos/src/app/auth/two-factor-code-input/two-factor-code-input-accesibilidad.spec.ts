import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { TwoFactorCodeInputComponent } from './two-factor-code-input.component';

// 50j: el codigo va en un solo campo con nombre, teclado numerico y el autocompletado de codigos
// de un solo uso del sistema (en lugar de seis casillas sin etiqueta), y su error queda asociado
// al campo para que el lector de pantalla lo lea.
describe('TwoFactorCodeInputComponent: accesibilidad', () => {
  let fixture: ComponentFixture<TwoFactorCodeInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorCodeInputComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(TwoFactorCodeInputComponent);
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const campos = () => [...el().querySelectorAll<HTMLInputElement>('input')];

  it('es un solo campo, con la etiqueta "Código de verificación"', () => {
    expect(campos()).toHaveLength(1);
    const etiqueta = el().querySelector<HTMLLabelElement>(`label[for="${campos()[0].id}"]`);

    expect(campos()[0].id).not.toBe('');
    expect(etiqueta?.textContent?.trim()).toBe('Código de verificación');
  });

  it('pide teclado numerico, acepta el autocompletado del codigo y admite 6 caracteres', () => {
    const [campo] = campos();

    expect(campo.getAttribute('inputmode')).toBe('numeric');
    expect(campo.getAttribute('autocomplete')).toBe('one-time-code');
    expect(campo.maxLength).toBe(6);
  });

  it('solo se queda con los digitos de lo que se escribe o se pega', () => {
    const [campo] = campos();
    campo.value = '12 a3-45';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance['code'].value).toBe('12345');
    expect(campo.value).toBe('12345');
  });

  it('con error, el campo queda invalido y el mensaje lo describe', () => {
    fixture.componentRef.setInput('error', 'Código inválido.');
    fixture.detectChanges();
    const [campo] = campos();
    const descrito = campo.getAttribute('aria-describedby')?.split(' ') ?? [];
    const textos = descrito.map((id) => el().querySelector(`[id="${id}"]`)?.textContent?.trim());

    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(textos).toContain('Código inválido.');
  });

  it('el rechazo se ve aunque el usuario haya escrito el codigo (control modificado)', () => {
    const [campo] = campos();
    campo.value = '123456';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    fixture.componentRef.setInput('error', 'Código inválido.');
    fixture.componentInstance.limpiar();
    fixture.detectChanges();

    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(el().textContent).toContain('Código inválido.');
  });

  it('al escribir otro codigo, el rechazo anterior se quita y no vuelve en la siguiente tecla', () => {
    fixture.componentRef.setInput('error', 'Código inválido.');
    fixture.detectChanges();
    const [campo] = campos();
    const escribir = (texto: string) => {
      campo.value = texto;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
    };

    escribir('1');
    escribir('12');

    expect(campo.getAttribute('aria-invalid')).toBeNull();
    expect(el().textContent).not.toContain('Código inválido.');
  });
});
