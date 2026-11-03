import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmDialogService } from './confirm-dialog.service';

interface OpcionesConfirmacion {
  message: string;
  header?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptButtonProps?: { severity?: string };
  accept?: () => void;
  reject?: () => void;
}

describe('ConfirmDialogService', () => {
  const confirmar = vi.fn();
  let servicio: ConfirmDialogService;

  beforeEach(() => {
    confirmar.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmationService, useValue: { confirm: confirmar } }],
    });
    servicio = TestBed.inject(ConfirmDialogService);
  });

  function opciones(): OpcionesConfirmacion {
    return confirmar.mock.calls[0]?.[0] as OpcionesConfirmacion;
  }

  it('resuelve true cuando se acepta', async () => {
    const promesa = servicio.confirm({ message: 'Confirmar accion' });

    opciones().accept?.();

    await expect(promesa).resolves.toBe(true);
  });

  it('resuelve false cuando se cancela', async () => {
    const promesa = servicio.confirm({ message: 'Confirmar accion' });

    opciones().reject?.();

    await expect(promesa).resolves.toBe(false);
  });

  it('usa el tono de peligro en el boton de aceptar', () => {
    void servicio.confirm({ message: 'Eliminar', severity: 'danger' });

    expect(opciones().acceptButtonProps?.severity).toBe('danger');
    expect(opciones().rejectLabel).toBe('Cancelar');
  });

  it('arma Eliminar para un objeto eliminable', () => {
    void servicio.confirmarEliminacion({ objeto: 'producto' });

    expect(opciones().header).toBe('Eliminar producto');
    expect(opciones().acceptLabel).toBe('Eliminar');
    expect(opciones().rejectLabel).toBe('Cancelar');
    expect(opciones().acceptButtonProps?.severity).toBe('danger');
  });

  it('arma Anular para una venta y respeta el detalle', () => {
    void servicio.confirmarEliminacion({ objeto: 'venta', detalle: 'La venta quedara anulada.' });

    expect(opciones().header).toBe('Anular venta');
    expect(opciones().acceptLabel).toBe('Anular');
    expect(opciones().message).toBe('La venta quedara anulada.');
  });
});
