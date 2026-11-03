import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EstadoPagina, FormaPagina, PageComponent } from './page.component';

@Component({
  standalone: true,
  imports: [PageComponent],
  template: `
    <ui-page [estado]="estado()" [forma]="forma()" (reintentar)="reintentos = reintentos + 1">
      <p class="contenido">Datos</p>
    </ui-page>
  `,
})
class AnfitrionComponent {
  readonly estado = signal<EstadoPagina>('cargando');
  readonly forma = signal<FormaPagina>('detalle');
  reintentos = 0;
}

function crear(estado: EstadoPagina, forma: FormaPagina = 'detalle') {
  const fixture = TestBed.createComponent(AnfitrionComponent);
  fixture.componentInstance.estado.set(estado);
  fixture.componentInstance.forma.set(forma);
  fixture.detectChanges();

  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('PageComponent', () => {
  it('cargando: muestra el skeleton y no el contenido ni texto de carga', () => {
    const { el } = crear('cargando');

    expect(el.querySelectorAll('ui-skeleton').length).toBeGreaterThan(0);
    expect(el.querySelector('.contenido')).toBeNull();
    expect(el.textContent).not.toMatch(/cargando/i);
  });

  it('cada forma tiene su propio skeleton', () => {
    const listado = crear('cargando', 'listado').el.querySelectorAll('ui-skeleton').length;
    const formulario = crear('cargando', 'formulario').el.querySelectorAll('ui-skeleton').length;

    expect(listado).toBe(2);
    expect(formulario).toBe(8);
  });

  it('error: muestra el mensaje y Reintentar emite', () => {
    const { fixture, el } = crear('error');

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar la información.');
    expect(el.querySelector('.contenido')).toBeNull();

    el.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    expect(fixture.componentInstance.reintentos).toBe(1);
  });

  it('listo: muestra el contenido', () => {
    const { el } = crear('listo');

    expect(el.querySelector('.contenido')?.textContent).toBe('Datos');
    expect(el.querySelector('ui-skeleton')).toBeNull();
  });
});
