import { Pipe, PipeTransform, inject } from '@angular/core';

import { FORMATO_REGIONAL } from './formato-regional';
import { VACIO, comoNumero, formatearNumero } from './formato';

@Pipe({ name: 'cantidad', standalone: true, pure: true })
export class CantidadPipe implements PipeTransform {
  private readonly formato = inject(FORMATO_REGIONAL);

  transform(valor: unknown, unidad = ''): string {
    const numero = comoNumero(valor);

    if (numero === null) {
      return VACIO;
    }

    if (numero === 0) {
      return '0';
    }

    const texto = formatearNumero(numero, this.formato.locale, 3);

    return unidad ? `${texto} ${unidad}` : texto;
  }
}
