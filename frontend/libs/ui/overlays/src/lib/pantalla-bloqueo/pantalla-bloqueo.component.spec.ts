import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PantallaBloqueoComponent } from './pantalla-bloqueo.component';

// SEG-12: la sesion bloqueada tapa toda la pantalla (no deja ver ventas ni montos) y se anuncia
// como un dialogo modal con nombre.

@Component({
  standalone: true,
  imports: [PantallaBloqueoComponent],
  template: `<ui-pantalla-bloqueo titulo="Sesión bloqueada"><p class="contenido">Ingresa tu PIN.</p></ui-pantalla-bloqueo>`,
})
class AnfitrionComponent {}

describe('PantallaBloqueoComponent', () => {
  function montar(): HTMLElement {
    TestBed.configureTestingModule({ imports: [AnfitrionComponent] });
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('es un dialogo modal con el titulo como nombre', () => {
    const raiz = montar();
    const dialogo = raiz.querySelector<HTMLElement>('[role="dialog"]')!;
    const titulo = raiz.querySelector<HTMLElement>(`#${dialogo.getAttribute('aria-labelledby')}`);

    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(titulo?.textContent?.trim()).toBe('Sesión bloqueada');
  });

  it('proyecta el contenido dentro del dialogo', () => {
    const raiz = montar();

    expect(raiz.querySelector('[role="dialog"] .contenido')?.textContent).toBe('Ingresa tu PIN.');
  });

  it('cubre la pantalla completa con fondo opaco por encima de los toasts', () => {
    const raiz = montar();
    const capa = raiz.querySelector<HTMLElement>('.ui-pantalla-bloqueo')!;
    const estilo = getComputedStyle(capa);

    expect(estilo.position).toBe('fixed');
    expect(estilo.backgroundColor).toBe('var(--nv-fondo)');
    expect(estilo.zIndex).toBe('calc(var(--nv-z-toast) + 1)');
  });
});
