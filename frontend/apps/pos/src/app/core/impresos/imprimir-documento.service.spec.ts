import { TestBed } from '@angular/core/testing';
import { SesionActualService } from '@nianva/domain-sesion';
import { IMPRESO_DE_EJEMPLO, Impreso, ImpresionService } from '@nianva/ui-print';
import { ToastService } from '@nianva/ui-shared';
import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FuenteImpresos } from './fuente-impresos';
import { ImprimirDocumentoService } from './imprimir-documento.service';

// UI-12: el impreso sale de la foto del documento. Verifica: un documento de la sucursal A impreso
// desde una sesion de la sucursal B dice A. Imprimir otra vez solo vuelve a pedir la foto: no
// registra ni cobra nada.

const DE_LA_SUCURSAL_A: Impreso = {
  ...IMPRESO_DE_EJEMPLO,
  encabezado: { ...IMPRESO_DE_EJEMPLO.encabezado, sucursal: 'Sucursal A', folio: 'V-1-7' },
};

describe('ImprimirDocumentoService', () => {
  let obtener: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;
  let print: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    obtener = vi.fn(() => of(DE_LA_SUCURSAL_A));
    toastError = vi.fn();
    print = vi.fn();
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({ focus: vi.fn(), print } as unknown as Window);
    TestBed.configureTestingModule({
      providers: [
        { provide: FuenteImpresos, useValue: { disponible: true, obtener } },
        { provide: ToastService, useValue: { error: toastError } },
      ],
    });
    // La sesion es de la sucursal B: el impreso no debe tomarla.
    TestBed.inject(SesionActualService).establecer({ sucursal: { id: 2, nombre: 'Sucursal B' } } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById(ImpresionService.ID_MARCO)?.remove();
  });

  const textoImpreso = () => (document.getElementById(ImpresionService.ID_MARCO) as HTMLIFrameElement).contentDocument!.body.textContent ?? '';

  it('un documento de la sucursal A impreso desde una sesion de la sucursal B dice A', async () => {
    await firstValueFrom(TestBed.inject(ImprimirDocumentoService).imprimir({ tipo: 'venta', venta: 'ulid-venta' }, 'ticket-80'));

    expect(obtener).toHaveBeenCalledWith({ tipo: 'venta', venta: 'ulid-venta' });
    expect(textoImpreso()).toContain('Sucursal A');
    expect(textoImpreso()).not.toContain('Sucursal B');
    expect(print).toHaveBeenCalledOnce();
  });

  it('imprimir dos veces solo vuelve a pedir la foto e imprime de nuevo', async () => {
    const servicio = TestBed.inject(ImprimirDocumentoService);

    await firstValueFrom(servicio.imprimir({ tipo: 'venta', venta: 'ulid-venta' }, 'ticket-80'));
    await firstValueFrom(servicio.imprimir({ tipo: 'venta', venta: 'ulid-venta' }, 'carta'));

    expect(obtener).toHaveBeenCalledTimes(2);
    expect(print).toHaveBeenCalledTimes(2);
    expect(servicio.imprimiendo()).toBe(false);
  });

  it('si el servidor no entrega la foto, avisa, no imprime y libera el boton', async () => {
    obtener.mockReturnValueOnce(throwError(() => new Error('500')));
    const servicio = TestBed.inject(ImprimirDocumentoService);

    await expect(firstValueFrom(servicio.imprimir({ tipo: 'corte', caja: 'ulid-caja' }, 'ticket-58'))).rejects.toThrow('500');

    expect(toastError).toHaveBeenCalledWith('No se pudo preparar el impreso. Intenta de nuevo.');
    expect(print).not.toHaveBeenCalled();
    expect(servicio.imprimiendo()).toBe(false);
  });

  it('disponible refleja si el servidor ya publica los impresos', () => {
    expect(TestBed.inject(ImprimirDocumentoService).disponible).toBe(true);
  });
});
