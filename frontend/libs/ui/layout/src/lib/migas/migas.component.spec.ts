import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { Miga, MigasComponent } from './migas.component';

@Component({
  standalone: true,
  imports: [MigasComponent],
  template: `<ui-migas [migas]="migas()" />`,
})
class AnfitrionComponent {
  readonly migas = signal<Miga[]>([
    { etiqueta: 'Inicio', ruta: '/', icono: 'pi pi-home' },
    { etiqueta: 'Clientes', ruta: '/crm' },
    { etiqueta: 'Nuevo cliente', ruta: '/crm/nuevo' },
  ]);
}

describe('MigasComponent', () => {
  let fixture: ComponentFixture<AnfitrionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
  });

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('es un nav con nombre accesible y una lista ordenada', () => {
    const nav = raiz().querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Ruta de navegación');
    expect(nav?.querySelectorAll('ol > li').length).toBe(3);
  });

  it('cada miga menos la ultima es un enlace a su ruta', () => {
    const enlaces = [...raiz().querySelectorAll('a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')]);

    expect(enlaces).toEqual([
      ['Inicio', '/'],
      ['Clientes', '/crm'],
    ]);
  });

  it('la ultima es la pagina actual: texto con aria-current="page", no un enlace', () => {
    const items = raiz().querySelectorAll('li');
    const ultima = items[items.length - 1];

    expect(ultima.querySelector('a')).toBeNull();
    expect(ultima.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Nuevo cliente');
  });

  it('el icono es decorativo y los separadores no se leen', () => {
    expect(raiz().querySelector('i.pi-home')?.getAttribute('aria-hidden')).toBe('true');
    const separadores = raiz().querySelectorAll('.ui-migas__separador');
    expect(separadores.length).toBe(2);
    expect([...separadores].every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('sin migas no pinta nada', () => {
    fixture.componentInstance.migas.set([]);
    fixture.detectChanges();

    expect(raiz().querySelector('nav')).toBeNull();
  });
});
