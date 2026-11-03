import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UMBRAL_INDICADOR_MS } from '@nianva/ui-feedback';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BtnEnviarComponent } from './btn-enviar.component';

@Component({
  standalone: true,
  imports: [BtnEnviarComponent],
  template: `
    <form (ngSubmit)="enviado.set(true)">
      <ui-btn-enviar [enviando]="enviando()" etiqueta="Guardar cambios" />
    </form>
  `,
})
class HostEnviarComponent {
  readonly enviando = signal(true);
  readonly enviado = signal(false);
}

describe('BtnEnviarComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [BtnEnviarComponent, HostEnviarComponent] }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function render() {
    const fixture = TestBed.createComponent(BtnEnviarComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('se deshabilita en el acto y no muestra el indicador antes del umbral', () => {
    const fixture = render();
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(boton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.ui-btn-enviar__indicador')).toBeNull();

    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS - 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ui-btn-enviar__indicador')).toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ui-btn-enviar__indicador')).not.toBeNull();
  });

  it('tiene type submit, etiqueta por defecto y etiqueta configurable', () => {
    const fixture = render();
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(boton.type).toBe('submit');
    expect(boton.textContent).toContain('Guardar');

    fixture.componentRef.setInput('etiqueta', 'Publicar');
    fixture.detectChanges();
    expect(boton.textContent).toContain('Publicar');
  });

  it('un clic mientras envia no dispara el submit', () => {
    const fixture = TestBed.createComponent(HostEnviarComponent);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    boton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.enviado()).toBe(false);
  });
});
