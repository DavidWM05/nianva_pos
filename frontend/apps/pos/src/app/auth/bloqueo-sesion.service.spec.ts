import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BloqueoSesionService } from './bloqueo-sesion.service';

// SEG-12: el estado del bloqueo vive en un solo lugar. Al bloquear se recuerda donde estaba el
// foco y al desbloquear vuelve ahi; mientras tanto, los overlays de Material quedan inertes.

describe('BloqueoSesionService', () => {
  let servicio: BloqueoSesionService;
  let boton: HTMLButtonElement;
  let contenedorOverlays: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(BloqueoSesionService);
    boton = document.createElement('button');
    boton.textContent = 'Registrar venta';
    contenedorOverlays = document.createElement('div');
    contenedorOverlays.className = 'cdk-overlay-container';
    document.body.append(boton, contenedorOverlays);
  });

  afterEach(() => {
    boton.remove();
    contenedorOverlays.remove();
  });

  it('activar() bloquea, deja inertes los overlays y desactivar() devuelve el foco', async () => {
    boton.focus();

    servicio.activar();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(servicio.activa()).toBe(true);
    expect(contenedorOverlays.hasAttribute('inert')).toBe(true);

    servicio.desactivar();
    TestBed.inject(ApplicationRef).tick();
    await Promise.resolve();

    expect(servicio.activa()).toBe(false);
    expect(contenedorOverlays.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(boton);
  });

  it('un segundo activar() no pisa el foco recordado', () => {
    boton.focus();
    servicio.activar();
    document.body.focus();

    servicio.activar();
    servicio.desactivar();
    TestBed.inject(ApplicationRef).tick();

    expect(document.activeElement).toBe(boton);
  });

  it('esperarDesbloqueo() resuelve al desactivar, o de inmediato si no esta bloqueada', async () => {
    await expect(servicio.esperarDesbloqueo()).resolves.toBeUndefined();

    servicio.activar();
    let resuelta = false;
    const espera = servicio.esperarDesbloqueo().then(() => (resuelta = true));
    await Promise.resolve();
    expect(resuelta).toBe(false);

    servicio.desactivar();
    await espera;
    expect(resuelta).toBe(true);
  });
});
