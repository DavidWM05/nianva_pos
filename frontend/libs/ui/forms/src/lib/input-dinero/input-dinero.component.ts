import { ChangeDetectionStrategy, Component, forwardRef, inject, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FORMATO_REGIONAL } from '@nianva/ui-format';

import { CampoBase } from '../campo/campo-base';

@Component({
  selector: 'ui-input-dinero',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputDineroComponent), multi: true }],
  templateUrl: './input-dinero.component.html',
  styleUrl: './input-dinero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDineroComponent extends CampoBase {
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly permitirNegativo = input(false);

  protected readonly texto = signal('');
  protected readonly valor = signal<number | null>(null);
  private readonly formato = inject(FORMATO_REGIONAL);

  writeValue(valor: unknown): void {
    const numero = this.aNumero(valor);
    this.valor.set(numero);
    this.texto.set(numero === null ? '' : this.formatearDinero(numero));
  }

  protected alEnfocar(evento: Event): void {
    const valor = this.valor();
    const texto = valor === null ? '' : this.formatearEdicion(valor);

    // El texto de edicion entra al input en el mismo foco, como en alEntrar. Si esperara a la
    // deteccion de cambios, el [value] cambiaria despues y el navegador perderia una seleccion
    // hecha en medio: lo que el usuario escribe se agregaria en vez de reemplazar.
    (evento.target as HTMLInputElement).value = texto;
    this.texto.set(texto);
  }

  protected alEntrar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const texto = this.sanitizar(entrada.value);
    const numero = this.aNumero(texto);

    entrada.value = texto;
    this.texto.set(texto);
    this.valor.set(numero);
    this.notificar(numero);
  }

  protected alSalir(): void {
    let valor = this.valor();

    if (valor !== null) {
      if (! this.permitirNegativo()) {
        valor = Math.max(0, valor);
      }
      if (this.min() !== null) {
        valor = Math.max(this.min() as number, valor);
      }
      if (this.max() !== null) {
        valor = Math.min(this.max() as number, valor);
      }
      if (valor !== this.valor()) {
        this.valor.set(valor);
        this.notificar(valor);
      }
    }

    this.texto.set(valor === null ? '' : this.formatearDinero(valor));
    this.tocar();
  }

  private sanitizar(texto: string): string {
    let limpio = texto.replace(/,/g, '').replace(/[^\d.-]/g, '');

    if (! this.permitirNegativo()) {
      limpio = limpio.replace(/-/g, '');
    } else {
      const negativo = limpio.startsWith('-');
      limpio = limpio.replace(/-/g, '');
      limpio = negativo ? `-${limpio}` : limpio;
    }

    const partes = limpio.split('.');
    const entero = partes[0] ?? '';
    const decimales = partes.slice(1).join('').slice(0, 2);

    return decimales.length > 0 || limpio.endsWith('.') ? `${entero}.${decimales}` : entero;
  }

  private aNumero(valor: unknown): number | null {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : null;
    }

    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor.trim();

    if (! /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(texto) || texto === '-' || texto === '.') {
      return null;
    }

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : null;
  }

  private formatearEdicion(valor: number): string {
    return String(Object.is(valor, -0) ? 0 : valor);
  }

  private formatearDinero(valor: number): string {
    const signo = valor < 0 ? '-' : '';
    const numero = new Intl.NumberFormat(this.formato.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(Math.abs(valor));

    return `${signo}${this.formato.moneda}${numero}`;
  }
}
