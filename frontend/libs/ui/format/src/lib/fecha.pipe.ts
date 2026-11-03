import { Pipe, PipeTransform, inject } from '@angular/core';

import { FORMATO_REGIONAL } from './formato-regional';
import { VACIO, fechaEnZona, fechaSolo, partesFecha } from './formato';

@Pipe({ name: 'fecha', standalone: true, pure: true })
export class FechaPipe implements PipeTransform {
  private readonly formato = inject(FORMATO_REGIONAL);

  transform(valor: unknown): string {
    if (typeof valor === 'string') {
      const sola = fechaSolo(valor.trim());

      if (sola !== null) {
        return sola;
      }
    }

    if (typeof valor !== 'string' && typeof valor !== 'number' && ! (valor instanceof Date)) {
      return VACIO;
    }

    const fecha = fechaEnZona(valor);

    if (fecha === null) {
      return VACIO;
    }

    const partes = partesFecha(fecha, this.formato.locale, this.formato.zonaHoraria, false);

    return `${partes['day']}/${partes['month']}/${partes['year']}`;
  }
}
