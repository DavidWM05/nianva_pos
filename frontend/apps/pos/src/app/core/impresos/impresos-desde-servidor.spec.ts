import type { ImpresoAbonoResource, ImpresoCorteResource, ImpresoVentaResource } from '@nianva/api-contrato';
import { describe, expect, it } from 'vitest';

import { impresoDeAbono, impresoDeCorte, impresoDeVenta } from './impresos-desde-servidor';

// UI-12 y DAT-03: el impreso muestra la foto que publica el servidor (A6) sin calcular nada. La
// sucursal, el folio, la fecha y el usuario vienen del documento.

const encabezado = {
  empresa: 'Abarrotes La Esquina',
  rfc: 'AES010101AAA',
  telefono: null,
  logo_url: 'https://cdn.ejemplo/logo.png',
  sucursal: 'Sucursal A',
  folio: 'V-1-7',
  fecha: '2026-11-22T15:30:00-06:00',
  usuario: 'Ana Cajera',
};

describe('impresoDeVenta', () => {
  const venta = {
    encabezado,
    lineas: [
      {
        id: '01J0000000000000000000000A',
        variante_id: 5,
        variante: { id: 5, nombre: 'M', producto_nombre: 'Playera' },
        cantidad: '2.000',
        precio_unitario: '75.00',
        descuento_aplicado: '0.00',
        subtotal: '150.00',
        lista_precio_nombre: null,
        regla_nombre: null,
        tasa_impuesto: '0.16',
        exento: false,
        impuesto: '20.69',
        unidad_medida_id: 1,
      },
    ],
    // Total con descuento de cupon: no se recalcula a partir de las lineas.
    totales: { total: '140.00', descuento_cupon: '10.00', descuento_manual: '0.00', abono_previo: '0.00' },
    pagos: [
      { metodo_pago_id: 1, nombre: 'Efectivo', monto: '100.00' },
      { metodo_pago_id: 9, nombre: null, monto: '40.00' },
    ],
    pie: { mensaje_ticket: 'Gracias por su compra' },
  } as unknown as ImpresoVentaResource;

  it('el encabezado es el del documento y no lleva el logo (recurso de red)', () => {
    const impreso = impresoDeVenta(venta);

    expect(impreso.titulo).toBe('Ticket de venta');
    expect(impreso.encabezado).toEqual({
      empresa: 'Abarrotes La Esquina',
      rfc: 'AES010101AAA',
      telefono: null,
      sucursal: 'Sucursal A',
      folio: 'V-1-7',
      fecha: '2026-11-22T15:30:00-06:00',
      usuario: 'Ana Cajera',
    });
    expect(JSON.stringify(impreso)).not.toContain('logo');
  });

  it('cada linea lleva descripcion con su variante, precio unitario, cantidad e importe tal cual', () => {
    expect(impresoDeVenta(venta).tabla?.filas).toEqual([
      [{ texto: 'Playera (M)', detalle: '75.00' }, { cantidad: '2.000', unidad: '' }, { dinero: '150.00' }],
    ]);
  });

  it('los totales son los del servidor: solo los descuentos que hubo y el total destacado', () => {
    expect(impresoDeVenta(venta).totales).toEqual([
      { etiqueta: 'Descuento de cupón', importe: '10.00', destacado: false },
      { etiqueta: 'Total', importe: '140.00', destacado: true },
    ]);
  });

  it('los pagos llevan su metodo; un metodo eliminado se dice', () => {
    expect(impresoDeVenta(venta).pagos).toEqual([
      { etiqueta: 'Efectivo', importe: '100.00' },
      { etiqueta: 'Método eliminado', importe: '40.00' },
    ]);
    expect(impresoDeVenta(venta).pie).toBe('Gracias por su compra');
  });
});

describe('impresoDeCorte', () => {
  const corte = {
    encabezado: { ...encabezado, folio: 'C-1-3', usuario: null },
    lineas: [{ metodo_pago_id: 1, nombre: 'Efectivo', total_teorico: '520.00', monto_contado: '500.00', diferencia: '-20.00' }],
    totales: { total_teorico: '520.00', monto_contado: '500.00', diferencia: '-20.00' },
    pagos: [],
    pie: { mensaje_ticket: null },
  } as unknown as ImpresoCorteResource;

  it('el cuadre por metodo y los totales del cierre, con la diferencia destacada', () => {
    const impreso = impresoDeCorte(corte);

    expect(impreso.titulo).toBe('Corte de caja');
    expect(impreso.tabla?.columnas.map((columna) => columna.titulo)).toEqual(['Método', 'Teórico', 'Contado', 'Diferencia']);
    expect(impreso.tabla?.filas).toEqual([[{ texto: 'Efectivo' }, { dinero: '520.00' }, { dinero: '500.00' }, { dinero: '-20.00' }]]);
    expect(impreso.totales).toEqual([
      { etiqueta: 'Total teórico', importe: '520.00', destacado: false },
      { etiqueta: 'Total contado', importe: '500.00', destacado: false },
      { etiqueta: 'Diferencia', importe: '-20.00', destacado: true },
    ]);
    expect(impreso.encabezado.usuario).toBeNull();
  });

  it('un total que el servidor no tiene (null) no se imprime', () => {
    const impreso = impresoDeCorte({ ...corte, totales: { total_teorico: null, monto_contado: null, diferencia: null } } as ImpresoCorteResource);

    expect(impreso.totales).toEqual([]);
  });
});

describe('impresoDeAbono', () => {
  it('el comprobante no tiene lineas: saldo anterior, abono destacado, saldo nuevo y los pagos', () => {
    const abono = {
      encabezado: { ...encabezado, folio: 'A-1-4' },
      lineas: [],
      totales: { abono: '100.00', saldo_anterior: '500.00', saldo_nuevo: '400.00' },
      pagos: [{ metodo_pago_id: 1, nombre: 'Efectivo', monto: '100.00' }],
      pie: { mensaje_ticket: null },
    } as unknown as ImpresoAbonoResource;

    const impreso = impresoDeAbono(abono);

    expect(impreso.titulo).toBe('Comprobante de abono');
    expect(impreso.tabla).toBeNull();
    expect(impreso.totales).toEqual([
      { etiqueta: 'Saldo anterior', importe: '500.00', destacado: false },
      { etiqueta: 'Abono', importe: '100.00', destacado: true },
      { etiqueta: 'Saldo nuevo', importe: '400.00', destacado: false },
    ]);
    expect(impreso.pagos).toEqual([{ etiqueta: 'Efectivo', importe: '100.00' }]);
  });
});
