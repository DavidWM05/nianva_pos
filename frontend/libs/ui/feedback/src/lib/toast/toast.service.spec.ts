import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService, VENTANA_DUPLICADOS_MS } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;
  let add: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    add = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: MessageService, useValue: { add } }],
    });
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emite un toast con la severidad y la duracion de cada tipo', () => {
    toast.success('Guardado');
    toast.error('Fallo');

    expect(add).toHaveBeenNthCalledWith(1, { severity: 'success', summary: 'Listo', detail: 'Guardado', life: 3000 });
    expect(add).toHaveBeenNthCalledWith(2, { severity: 'error', summary: 'Error', detail: 'Fallo', life: 4000 });
  });

  it('el mismo mensaje repetido dentro de la ventana produce un solo toast', () => {
    toast.error('Sin conexion');
    toast.error('Sin conexion');
    toast.error('Sin conexion');

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('pasada la ventana, el mismo mensaje se vuelve a mostrar', () => {
    toast.error('Sin conexion');
    vi.advanceTimersByTime(VENTANA_DUPLICADOS_MS);
    toast.error('Sin conexion');

    expect(add).toHaveBeenCalledTimes(2);
  });

  it('mensajes distintos o de otra severidad no se descartan', () => {
    toast.error('A');
    toast.error('B');
    toast.warn('A');

    expect(add).toHaveBeenCalledTimes(3);
  });

  it('errorTecnico incluye el codigo de soporte', () => {
    toast.errorTecnico('Fallo interno.', 'abc-123');

    expect(add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Fallo interno. Código de soporte: abc-123',
      life: 4000,
    });
  });

  it('descarta los error() de pantalla durante la ventana tecnica', () => {
    toast.errorTecnico('No hay conexión con el servidor.');
    toast.error('No se pudo guardar.');

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('no descarta success, warn ni info durante la ventana tecnica', () => {
    toast.errorTecnico('No hay conexión con el servidor.');
    toast.success('Guardado');
    toast.warn('Aviso');
    toast.info('Info');

    expect(add).toHaveBeenCalledTimes(4);
  });

  it('vuelve a mostrar error() despues de la ventana tecnica', () => {
    toast.errorTecnico('No hay conexión con el servidor.');
    vi.advanceTimersByTime(VENTANA_DUPLICADOS_MS);
    toast.error('No se pudo guardar.');

    expect(add).toHaveBeenCalledTimes(2);
  });
});
