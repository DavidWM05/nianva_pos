import { Component, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { REGISTRO_NAVEGACION } from '../navegacion/registro-navegacion';
import { PageHeaderComponent } from './page-header.component';

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <ui-page-header clave="crm" subtitulo="Quienes te compran">
      <button acciones type="button">Nuevo cliente</button>
    </ui-page-header>
  `,
})
class AnfitrionComponent {}

describe('PageHeaderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: REGISTRO_NAVEGACION,
          useValue: [{ clave: 'crm', ruta: 'crm', nombre: 'Clientes', icono: 'pi pi-users' }],
        },
      ],
    });
  });

  it('toma el nombre y el icono del registro, con subtitulo y acciones', () => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Clientes');
    expect(el.querySelector('i')?.className).toBe('pi pi-users');
    expect(el.querySelector('.ui-page-header__subtitulo')?.textContent?.trim()).toBe('Quienes te compran');
    expect(el.querySelector('.ui-page-header__acciones button')?.textContent).toContain('Nuevo cliente');
  });

  it('falla con una clave que no esta en el registro', () => {
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('clave', 'no-existe');

    expect(() => fixture.detectChanges()).toThrow(/no-existe/);
  });

  it('no tiene entrada de titulo: el nombre solo sale del registro (UI-08)', () => {
    const entradas = reflectComponentType(PageHeaderComponent)?.inputs.map((entrada) => entrada.propName);

    expect(entradas?.sort()).toEqual(['clave', 'subtitulo']);
  });
});
