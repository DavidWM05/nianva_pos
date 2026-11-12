import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { BreadcrumbComponent } from './breadcrumb.component';

@Component({ standalone: true, template: '' })
class Vacia {}

@Component({
  standalone: true,
  imports: [BreadcrumbComponent, RouterOutlet],
  template: '<nucleo-breadcrumb /><router-outlet />',
})
class Anfitrion {}

// Comportamiento del breadcrumb sin mirar el DOM del componente que lo pinta (50i): los enlaces
// se leen por su texto y su href.
describe('BreadcrumbComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [
        provideRouter([
          {
            path: 'crm',
            data: { breadcrumb: 'Clientes' },
            children: [
              { path: '', component: Vacia },
              { path: 'nuevo', data: { breadcrumb: 'Nuevo cliente' }, component: Vacia },
            ],
          },
        ]),
      ],
    });
  });

  let fixture: ComponentFixture<Anfitrion>;

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function navegar(url: string): Promise<HTMLElement> {
    fixture = TestBed.createComponent(Anfitrion);
    await TestBed.inject(Router).navigateByUrl(url);
    await refrescar();

    return fixture.nativeElement as HTMLElement;
  }

  const enlaces = (el: HTMLElement) =>
    [...el.querySelectorAll('nucleo-breadcrumb a')].map((a) => ({
      texto: a.textContent?.trim() ?? '',
      href: a.getAttribute('href'),
    }));

  it('arranca con un enlace a Inicio y arma una miga por cada nivel con breadcrumb', async () => {
    const el = await navegar('/crm/nuevo');

    const lista = enlaces(el);

    expect(lista[0]).toEqual({ texto: 'Inicio', href: '/' });
    expect(lista.map((e) => e.texto)).toContain('Clientes');
    expect(el.querySelector('nucleo-breadcrumb')?.textContent).toContain('Nuevo cliente');
    expect(lista.find((e) => e.texto === 'Clientes')?.href).toBe('/crm');
  });

  it('se rearma al navegar', async () => {
    const el = await navegar('/crm/nuevo');
    expect(el.querySelector('nucleo-breadcrumb')?.textContent).toContain('Nuevo cliente');

    await TestBed.inject(Router).navigateByUrl('/crm');
    await refrescar();

    expect(el.querySelector('nucleo-breadcrumb')?.textContent).toContain('Clientes');
    expect(el.querySelector('nucleo-breadcrumb')?.textContent).not.toContain('Nuevo cliente');
  });
});
