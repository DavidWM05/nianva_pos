import { TestBed } from '@angular/core/testing';
import { ApartadoService } from '@nianva/domain-apartados';
import { CajaService, VentaService } from '@nianva/domain-tpv';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { FuenteImpresos } from './fuente-impresos';

// UI-12 (A6): cada documento pide su propio GET .../impreso y la respuesta se traduce al impreso de
// ui/print.

const encabezado = { empresa: 'Tienda', rfc: null, telefono: null, logo_url: null, sucursal: 'Centro', folio: 'X-1-1', fecha: null, usuario: null };

describe('FuenteImpresos (servidor)', () => {
  function montar() {
    const servicios = {
      venta: { impreso: vi.fn(() => of({ encabezado, lineas: [], totales: { total: '10.00', descuento_cupon: '0.00', descuento_manual: '0.00', abono_previo: '0.00' }, pagos: [], pie: { mensaje_ticket: null } })) },
      caja: { impreso: vi.fn(() => of({ encabezado, lineas: [], totales: { total_teorico: null, monto_contado: null, diferencia: null }, pagos: [], pie: { mensaje_ticket: null } })) },
      apartado: { impresoAbono: vi.fn(() => of({ encabezado, lineas: [], totales: { abono: '5.00', saldo_anterior: '9.00', saldo_nuevo: '4.00' }, pagos: [], pie: { mensaje_ticket: null } })) },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: VentaService, useValue: servicios.venta },
        { provide: CajaService, useValue: servicios.caja },
        { provide: ApartadoService, useValue: servicios.apartado },
      ],
    });

    return { fuente: TestBed.inject(FuenteImpresos), servicios };
  }

  it('esta disponible: A6 publica los impresos', () => {
    expect(montar().fuente.disponible).toBe(true);
  });

  it('la venta pide GET /ventas/{venta}/impreso y llega como ticket de venta', async () => {
    const { fuente, servicios } = montar();

    const impreso = await firstValueFrom(fuente.obtener({ tipo: 'venta', venta: 'v1' }));

    expect(servicios.venta.impreso).toHaveBeenCalledWith('v1');
    expect(impreso.titulo).toBe('Ticket de venta');
  });

  it('el corte pide GET /caja/{caja}/impreso y el abono, GET /apartados/{apartado}/abonos/{abono}/impreso', async () => {
    const { fuente, servicios } = montar();

    const corte = await firstValueFrom(fuente.obtener({ tipo: 'corte', caja: 'c1' }));
    const abono = await firstValueFrom(fuente.obtener({ tipo: 'abono', apartado: 'a1', abono: 'b1' }));

    expect(servicios.caja.impreso).toHaveBeenCalledWith('c1');
    expect(servicios.apartado.impresoAbono).toHaveBeenCalledWith('a1', 'b1');
    expect(corte.titulo).toBe('Corte de caja');
    expect(abono.titulo).toBe('Comprobante de abono');
  });
});
