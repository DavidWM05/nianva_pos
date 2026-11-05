import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService, VENTANA_DUPLICADOS_MS } from './toast.service';

// Reglas de UI-13 que cubrian los specs retirados en el 49b (escritos contra MessageService de
// PrimeNG). Se observa lo que el servicio pide mostrar: severidad, detalle y duracion.
describe('ToastService: reglas de UI-13', () => {
  let toast: ToastService;
  let abrir: ReturnType<typeof vi.fn>;

  const mostrados = () =>
    abrir.mock.calls.map(([, config]) => ({
      severidad: config.data.severity,
      detalle: config.data.detail,
      duracion: config.duration,
    }));

  beforeEach(() => {
    vi.useFakeTimers();
    abrir = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { openFromComponent: abrir } }],
    });
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cada tipo tiene su severidad y su duracion', () => {
    toast.success('Guardado');
    toast.error('Fallo');
    toast.warn('Revisa');
    toast.info('Dato');

    expect(mostrados()).toEqual([
      { severidad: 'success', detalle: 'Guardado', duracion: 3000 },
      { severidad: 'error', detalle: 'Fallo', duracion: 4000 },
      { severidad: 'warn', detalle: 'Revisa', duracion: 4000 },
      { severidad: 'info', detalle: 'Dato', duracion: 3000 },
    ]);
  });

  it('el mismo mensaje repetido dentro de la ventana se muestra una vez', () => {
    toast.error('Sin conexion');
    toast.error('Sin conexion');
    toast.error('Sin conexion');

    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('pasada la ventana, el mismo mensaje se vuelve a mostrar', () => {
    toast.error('Sin conexion');
    vi.advanceTimersByTime(VENTANA_DUPLICADOS_MS);
    toast.error('Sin conexion');

    expect(abrir).toHaveBeenCalledTimes(2);
  });

  it('mensajes distintos o de otra severidad no se descartan', () => {
    toast.error('Uno');
    toast.error('Dos');
    toast.warn('Uno');

    expect(abrir).toHaveBeenCalledTimes(3);
  });

  it('errorTecnico agrega el codigo de soporte', () => {
    toast.errorTecnico('Fallo interno.', 'corr-1');

    expect(mostrados()[0]).toMatchObject({ severidad: 'error', detalle: expect.stringContaining('corr-1') });
  });

  it('despues de un error tecnico, descarta los error() de pantalla durante la ventana', () => {
    toast.errorTecnico('Fallo interno.');
    toast.error('No se pudo guardar');

    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('durante la ventana tecnica no descarta success, warn ni info', () => {
    toast.errorTecnico('Fallo interno.');
    toast.success('Guardado');
    toast.warn('Revisa');
    toast.info('Dato');

    expect(abrir).toHaveBeenCalledTimes(4);
  });

  it('pasada la ventana tecnica, error() vuelve a mostrarse', () => {
    toast.errorTecnico('Fallo interno.');
    vi.advanceTimersByTime(VENTANA_DUPLICADOS_MS);
    toast.error('No se pudo guardar');

    expect(abrir).toHaveBeenCalledTimes(2);
  });
});
