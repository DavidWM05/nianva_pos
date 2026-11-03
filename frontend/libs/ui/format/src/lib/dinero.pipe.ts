import { Pipe, PipeTransform, inject } from '@angular/core';

import { FORMATO_REGIONAL } from './formato-regional';
import { VACIO, comoNumero, formatearNumero } from './formato';

@Pipe({ name: 'dinero', standalone: true, pure: true })
export class DineroPipe implements PipeTransform {
  private readonly formato = inject(FORMATO_REGIONAL);

  transform(valor: unknown): string {
    const numero = comoNumero(valor);

    if (numero === null) {
      return VACIO;
    }

    const signo = numero < 0 ? '-' : '';
    const texto = formatearNumero(Math.abs(numero), this.formato.locale, 2, 2);

    return `${signo}${this.formato.moneda}${texto}`;
  }
}
