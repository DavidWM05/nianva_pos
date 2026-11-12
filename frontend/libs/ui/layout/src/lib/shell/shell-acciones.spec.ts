import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { PantallaService } from './pantalla.service';
import { ShellComponent } from './shell.component';

@Component({
  standalone: true,
  imports: [ShellComponent],
  template: `
    <ui-shell>
      <nav menu>Menu</nav>
      <span encabezado class="migas">Inicio</span>
      <button acciones type="button" class="cuenta">Cuenta</button>
      <p class="contenido">Pantalla</p>
    </ui-shell>
  `,
})
class AnfitrionComponent {}

// 50i: hueco `acciones` en el encabezado, a la derecha, para que la app ponga su menu de usuario.
// ui-shell no sabe que hay ahi.
describe('ShellComponent: acciones del encabezado', () => {
  const angosta = signal(false);

  beforeEach(() => {
    angosta.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } }],
    });
  });

  function crear(): HTMLElement {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('proyecta las acciones dentro del encabezado, despues del contenido de [encabezado]', () => {
    const el = crear();
    const encabezado = el.querySelector('.ui-shell__encabezado');
    const acciones = encabezado?.querySelector('.ui-shell__acciones .cuenta');

    expect(acciones).not.toBeNull();
    expect(el.querySelector('.ui-shell__contenido .cuenta')).toBeNull();
    const migas = encabezado?.querySelector('.migas');
    expect(migas && acciones && migas.compareDocumentPosition(acciones) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('en pantalla angosta las acciones siguen en el encabezado, fuera del panel del menu', () => {
    angosta.set(true);
    const el = crear();

    expect(el.querySelector('.ui-shell__encabezado .ui-shell__acciones .cuenta')).not.toBeNull();
    expect(el.querySelector('.ui-shell__menu .cuenta')).toBeNull();
  });
});
