import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { CampoBase } from '../campo/campo-base';

@Component({
  selector: 'ui-input-cantidad',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputCantidadComponent), multi: true }],
  templateUrl: './input-cantidad.component.html',
  styleUrl: './input-cantidad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputCantidadComponent extends CampoBase {
  readonly decimales = input(3);
  readonly unidad = input('');

  protected readonly texto = signal('');
  protected readonly valor = signal<number | null>(null);
  protected readonly decimalesEfectivos = computed(() => Math.max(0, Math.min(3, this.decimales())));
  protected readonly modoEntrada = computed(() => (this.decimalesEfectivos() === 0 ? 'numeric' : 'decimal'));

  writeValue(valor: unknown): void {
    const numero = this.aNumero(valor);
    this.valor.set(numero);
    this.texto.set(numero === null ? '' : String(Object.is(numero, -0) ? 0 : numero));
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
    const valor = this.valor();

    this.texto.set(valor === null ? '' : String(valor));
    this.tocar();
  }

  private sanitizar(texto: string): string {
    let limpio = texto.replace(/,/g, '').replace(/[^\d.]/g, '');
    const partes = limpio.split('.');
    const decimales = Math.max(0, this.decimalesEfectivos());
    const entero = partes[0] ?? '';
    const decimalesTexto = partes.slice(1).join('').slice(0, decimales);

    if (decimales === 0) {
      limpio = entero;
    } else {
      limpio = decimalesTexto.length > 0 || limpio.endsWith('.') ? `${entero}.${decimalesTexto}` : entero;
    }

    return limpio;
  }

  private aNumero(valor: unknown): number | null {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) && valor >= 0 ? valor : null;
    }

    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor.trim();

    if (! /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(texto) || texto === '.') {
      return null;
    }

    const numero = Number(texto);

    return Number.isFinite(numero) && numero >= 0 ? numero : null;
  }
}
