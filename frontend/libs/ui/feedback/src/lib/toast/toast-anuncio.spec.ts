import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from './toast.service';

describe('ToastService: anuncio accesible real', () => {
  let toast: ToastService;
  let snackBar: MatSnackBar;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    TestBed.configureTestingModule({ providers: [provideAnimationsAsync(), ToastService] });
    toast = TestBed.inject(ToastService);
    snackBar = TestBed.inject(MatSnackBar);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  function avanzarAnuncio(): void {
    TestBed.tick();
    vi.advanceTimersByTime(1000);
    TestBed.tick();
  }

  function comprobarRegion(mensaje: string): void {
    const contenedor = document.querySelector('mat-snack-bar-container');
    expect(contenedor).not.toBeNull();
    if (!contenedor) return;

    const regiones = [...contenedor.querySelectorAll('[aria-live]')];
    expect(regiones).toHaveLength(1);
    expect(regiones[0].closest('[aria-hidden]')).toBeNull();
    expect(regiones[0].textContent).toContain(mensaje);
  }

  it('anuncia success con una sola región viva y sin error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    toast.success('Guardado correctamente.');
    avanzarAnuncio();

    expect(error.mock.calls.flat().join(' ')).not.toContain('HierarchyRequestError');
    comprobarRegion('Guardado correctamente.');
    error.mockRestore();
  });

  it('anuncia error con una sola región viva y sin error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    snackBar.dismiss();
    TestBed.tick();
    toast.error('No se pudo guardar.');
    avanzarAnuncio();

    expect(error.mock.calls.flat().join(' ')).not.toContain('HierarchyRequestError');
    comprobarRegion('No se pudo guardar.');
    error.mockRestore();
  });
});
