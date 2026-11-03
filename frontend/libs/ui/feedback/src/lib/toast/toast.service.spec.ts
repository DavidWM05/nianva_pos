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
});
