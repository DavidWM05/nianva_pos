import { ChangeDetectionStrategy, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { CampoBase } from '../campo/campo-base';

/**
 * Codigo de un solo uso visible, como el TOTP de una app de autenticacion: un solo campo con
 * teclado numerico y el autocompletado de codigos del sistema (`one-time-code`). Se usa dentro
 * de `ui-campo`, que pone la etiqueta y el mensaje de error. Para el PIN de caja, que se oculta
 * y trae teclado en pantalla, esta `ui-input-pin`.
 */
@Component({
  selector: 'ui-input-codigo',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputCodigoComponent), multi: true }],
  templateUrl: './input-codigo.component.html',
  styleUrl: './input-codigo.component.scss',
  host: { '[style.--ui-input-codigo-longitud]': 'longitudEfectiva()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputCodigoComponent extends CampoBase {
  readonly longitud = input(6);
  /** El codigo llego a `longitud` digitos. */
  readonly completo = output<string>();

  protected readonly digitos = signal('');
  protected readonly longitudEfectiva = computed(() => Math.max(1, this.longitud()));

  writeValue(valor: unknown): void {
    this.digitos.set(this.limpiarTexto(String(valor ?? '')));
  }

  protected alEntrada(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const digitos = this.limpiarTexto(entrada.value);

    entrada.value = digitos;
    if (digitos === this.digitos()) {
      return;
    }

    this.digitos.set(digitos);
    this.notificar(digitos);
    if (digitos.length === this.longitudEfectiva()) {
      this.completo.emit(digitos);
    }
  }

  protected alSalir(): void {
    this.tocar();
  }

  private limpiarTexto(texto: string): string {
    return texto.replace(/\D/g, '').slice(0, this.longitudEfectiva());
  }
}
