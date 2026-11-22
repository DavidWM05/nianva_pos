import type { ImpresoAbonoResource, ImpresoCorteResource, ImpresoVentaResource } from '@nianva/api-contrato';
import type { EncabezadoImpreso, Impreso, PagoImpreso, RenglonImpreso } from '@nianva/ui-print';

/**
 * Traduce la foto de cada documento (A6, `GET .../impreso`) al impreso genérico de `ui/print`. No
 * calcula nada (UI-12, DAT-03): cada importe es el que publica el servidor; solo se omiten los
 * renglones en cero que no aportan (un descuento que no hubo).
 *
 * El logo (`logo_url`) no se imprime: es un recurso de red y los impresos no tienen dependencias de
 * red (UI-12).
 */
type EncabezadoDelServidor = ImpresoVentaResource['encabezado'];
type PagoDelServidor = ImpresoVentaResource['pagos'][number];

export function impresoDeVenta(venta: ImpresoVentaResource): Impreso {
  const { totales } = venta;

  return {
    titulo: 'Ticket de venta',
    encabezado: encabezado(venta.encabezado),
    tabla: {
      columnas: [
        { titulo: 'Descripción', numerica: false },
        { titulo: 'Cant.', numerica: true },
        { titulo: 'Importe', numerica: true },
      ],
      filas: venta.lineas.map((linea) => [
        { texto: descripcionDeLinea(linea), detalle: linea.precio_unitario },
        { cantidad: linea.cantidad, unidad: linea.presentacion_nombre ?? linea.unidad_medida_nombre ?? '' },
        { dinero: linea.subtotal },
      ]),
    },
    totales: [
      ...renglonSiNoEsCero('Descuento de cupón', totales.descuento_cupon),
      ...renglonSiNoEsCero('Descuento', totales.descuento_manual),
      ...renglonSiNoEsCero('Abono previo', totales.abono_previo),
      { etiqueta: 'Total', importe: totales.total, destacado: true },
    ],
    pagos: venta.pagos.map(pago),
    pie: venta.pie.mensaje_ticket,
  };
}

export function impresoDeCorte(corte: ImpresoCorteResource): Impreso {
  const { totales } = corte;

  return {
    titulo: 'Corte de caja',
    encabezado: encabezado(corte.encabezado),
    tabla: {
      columnas: [
        { titulo: 'Método', numerica: false },
        { titulo: 'Teórico', numerica: true },
        { titulo: 'Contado', numerica: true },
        { titulo: 'Diferencia', numerica: true },
      ],
      filas: corte.lineas.map((metodo) => [
        { texto: metodo.nombre },
        { dinero: metodo.total_teorico },
        { dinero: metodo.monto_contado },
        { dinero: metodo.diferencia },
      ]),
    },
    totales: [
      ...renglonSiHay('Total teórico', totales.total_teorico),
      ...renglonSiHay('Total contado', totales.monto_contado),
      ...renglonSiHay('Diferencia', totales.diferencia, true),
    ],
    pagos: [],
    pie: corte.pie.mensaje_ticket,
  };
}

export function impresoDeAbono(abono: ImpresoAbonoResource): Impreso {
  const { totales } = abono;

  return {
    titulo: 'Comprobante de abono',
    encabezado: encabezado(abono.encabezado),
    tabla: null,
    totales: [
      { etiqueta: 'Saldo anterior', importe: totales.saldo_anterior, destacado: false },
      { etiqueta: 'Abono', importe: totales.abono, destacado: true },
      { etiqueta: 'Saldo nuevo', importe: totales.saldo_nuevo, destacado: false },
    ],
    pagos: abono.pagos.map(pago),
    pie: abono.pie.mensaje_ticket,
  };
}

function encabezado(datos: EncabezadoDelServidor): EncabezadoImpreso {
  return {
    empresa: datos.empresa,
    rfc: datos.rfc,
    telefono: datos.telefono,
    sucursal: datos.sucursal,
    folio: datos.folio,
    fecha: datos.fecha,
    usuario: datos.usuario,
  };
}

function descripcionDeLinea(linea: ImpresoVentaResource['lineas'][number]): string {
  const producto = linea.variante?.producto_nombre ?? 'Producto';
  const variante = linea.variante?.nombre ? ` (${linea.variante.nombre})` : '';

  return `${producto}${variante}`;
}

function pago(datos: PagoDelServidor): PagoImpreso {
  return { etiqueta: datos.nombre ?? 'Método eliminado', importe: datos.monto };
}

function renglonSiNoEsCero(etiqueta: string, importe: string): RenglonImpreso[] {
  return Number(importe) === 0 ? [] : [{ etiqueta, importe, destacado: false }];
}

function renglonSiHay(etiqueta: string, importe: string | null, destacado = false): RenglonImpreso[] {
  return importe === null ? [] : [{ etiqueta, importe, destacado }];
}
