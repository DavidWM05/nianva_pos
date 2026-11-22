/**
 * Un impreso listo para pintar (UI-12). La foto del documento la arma el servidor (A6:
 * `GET .../impreso` de la venta, el corte y el abono) y la app la traduce a esta forma sin calcular
 * nada; `ui/print` solo la pinta. Es genérica a propósito: `ui/print` no conoce el contrato.
 */
export interface Impreso {
  /** Por ejemplo "Ticket de venta", "Corte de caja" o "Comprobante de abono". */
  titulo: string;
  encabezado: EncabezadoImpreso;
  /** Las líneas del documento (artículos, cuadre por método); null si no tiene (el abono). */
  tabla: TablaImpreso | null;
  totales: RenglonImpreso[];
  pagos: PagoImpreso[];
  /** El mensaje del ticket de la configuración. */
  pie: string | null;
}

/**
 * El único encabezado de todos los impresos: empresa, sucursal DEL DOCUMENTO, folio, fecha y
 * usuario. El servidor manda null donde el documento no tiene el dato (un corte histórico sin
 * usuario de cierre, por ejemplo).
 */
export interface EncabezadoImpreso {
  empresa: string;
  rfc: string | null;
  telefono: string | null;
  sucursal: string;
  folio: string | null;
  /** ISO 8601, del documento. */
  fecha: string | null;
  usuario: string | null;
}

export interface TablaImpreso {
  columnas: ColumnaImpreso[];
  filas: CeldaImpreso[][];
}

export interface ColumnaImpreso {
  titulo: string;
  /** Las columnas de importes y cantidades van alineadas a la derecha. */
  numerica: boolean;
}

/** Una celda: texto (con un importe secundario opcional, como el precio unitario), dinero o cantidad con su unidad. */
export type CeldaImpreso = { texto: string; detalle?: string } | { dinero: string } | { cantidad: string; unidad: string };

export interface RenglonImpreso {
  etiqueta: string;
  /** Decimal en texto, como lo publica el servidor. */
  importe: string;
  /** El total a pagar (o el abono) va resaltado. */
  destacado: boolean;
}

/** Un pago del documento: el método y su importe. */
export interface PagoImpreso {
  etiqueta: string;
  importe: string;
}

/** Anchos de papel (UI-12): ticket de 58 y 80 mm y hoja carta. */
export type FormatoImpreso = 'ticket-58' | 'ticket-80' | 'carta';
