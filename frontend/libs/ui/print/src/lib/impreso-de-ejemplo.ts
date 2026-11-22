import { Impreso } from './impreso.types';

/**
 * Un ticket de venta de ejemplo, con los datos que pide UI-12: para el catálogo y los specs. El
 * total no cuadra con las líneas a propósito: el impreso muestra lo que dice el documento.
 */
export const IMPRESO_DE_EJEMPLO: Impreso = {
  titulo: 'Ticket de venta',
  encabezado: {
    empresa: 'Abarrotes La Esquina',
    rfc: 'AES010101AAA',
    telefono: '555 123 4567',
    sucursal: 'Sucursal Centro',
    folio: 'V-1-23',
    fecha: '2026-11-22T15:30:00-06:00',
    usuario: 'Vendedor Escenario',
  },
  tabla: {
    columnas: [
      { titulo: 'Descripción', numerica: false },
      { titulo: 'Cant.', numerica: true },
      { titulo: 'Importe', numerica: true },
    ],
    filas: [
      [{ texto: 'Agua 1L', detalle: '18.00' }, { cantidad: '2.000', unidad: 'pza' }, { dinero: '36.00' }],
      [{ texto: 'Queso fresco', detalle: '120.00' }, { cantidad: '0.500', unidad: 'kg' }, { dinero: '60.00' }],
    ],
  },
  totales: [
    { etiqueta: 'Descuento', importe: '6.00', destacado: false },
    { etiqueta: 'Total', importe: '90.00', destacado: true },
  ],
  pagos: [{ etiqueta: 'Efectivo', importe: '100.00' }],
  pie: 'Gracias por su compra',
};
