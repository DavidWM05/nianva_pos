import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { VentaService } from '../tpv/venta.service';
import { Venta, VentasPagina } from '../tpv/venta.types';
import { VentaBuscadorService } from './venta-buscador.service';

describe('VentaBuscadorService', () => {
  const ventaCompletada: Venta = {
    id: 3,
    fecha: '2026-07-01',
    cliente: { id: 9, nombre: 'Juan Pérez' },
    total: '500.00',
    descuento_cupon: '0.00',
    descuento_manual: '0.00',
    abono_previo: '0.00',
    estado: 'completada',
    motivo_anulacion: null,
    fecha_anulacion: null,
    es_venta_sombra: false,
  };
  const ventaAnulada: Venta = { ...ventaCompletada, id: 4, estado: 'anulada' };

  function paginaCon(data: Venta[]): VentasPagina {
    return { data, total: data.length, permisos: { anular: true } };
  }

  function crearServicio(ventaService: Partial<VentaService>): VentaBuscadorService {
    TestBed.configureTestingModule({
      providers: [{ provide: VentaService, useValue: ventaService }],
    });

    return TestBed.inject(VentaBuscadorService);
  }

  it('buscar() arma la etiqueta con id, cliente y total, y excluye ventas anuladas', async () => {
    const listar = vi.fn().mockReturnValue(of(paginaCon([ventaCompletada, ventaAnulada])));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.buscar('Juan').toPromise();

    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ first: 0 }), 'Juan');
    expect(resultado).toEqual([{ id: 3, nombre: 'Venta #3 — Juan Pérez — $500.00' }]);
  });

  it('obtener() adapta la venta al contrato EntidadBuscable', async () => {
    const obtener = vi.fn().mockReturnValue(of(ventaCompletada));
    const servicio = crearServicio({ obtener });

    const resultado = await servicio.obtener(3).toPromise();

    expect(resultado).toEqual({ id: 3, nombre: 'Venta #3 — Juan Pérez — $500.00' });
  });
});
