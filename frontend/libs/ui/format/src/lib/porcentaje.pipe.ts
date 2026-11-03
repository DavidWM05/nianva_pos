import { Pipe, PipeTransform, inject } from '@angular/core';

import { FORMATO_REGIONAL } from './formato-regional';
import { VACIO, comoNumero, formatearNumero } from './formato';

@Pipe({ name: 'porcentaje', standalone: true, pure: true })
export class PorcentajePipe implements PipeTransform {
  private readonly formato = inject(FORMATO_REGIONAL);

  transform(valor: unknown): string {
    const numero = comoNumero(valor);

    if (numero === null) {
      return VACIO;
    }

    return `${formatearNumero(numero, this.formato.locale, 2)}%`;
  }
}
