import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter } from '@angular/material/core';

export const FORMATO_FECHA_ISO = 'YYYY-MM-DD';

export const FORMATOS_FECHA_ES_MX: MatDateFormats = {
  parse: {
    dateInput: FORMATO_FECHA_ISO,
  },
  display: {
    dateInput: FORMATO_FECHA_ISO,
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

/**
 * El adaptador nativo interpreta `YYYY-MM-DD` con `Date.parse`, que lo toma como UTC y
 * puede mostrar el día anterior en America/Mexico_City. Este adaptador construye la fecha
 * con los componentes locales y formatea el input con el mismo formato.
 */
@Injectable()
export class FechaISOAdapter extends NativeDateAdapter {
  override parse(valor: unknown, formato?: unknown): Date | null {
    if (typeof valor === 'string') {
      const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());

      if (partes) {
        return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
      }
    }

    return super.parse(valor, formato);
  }

  override format(fecha: Date, formato: unknown): string {
    if (formato === FORMATO_FECHA_ISO) {
      return [
        fecha.getFullYear(),
        `${fecha.getMonth() + 1}`.padStart(2, '0'),
        `${fecha.getDate()}`.padStart(2, '0'),
      ].join('-');
    }

    return super.format(fecha, formato as Intl.DateTimeFormatOptions);
  }

  override deserialize(valor: unknown): Date | null {
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
      return this.parse(valor, FORMATO_FECHA_ISO);
    }

    return super.deserialize(valor);
  }
}

export const PROVEEDORES_FECHA_ES_MX: Provider[] = [
  { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
  { provide: DateAdapter, useClass: FechaISOAdapter },
  { provide: MAT_DATE_FORMATS, useValue: FORMATOS_FECHA_ES_MX },
];
