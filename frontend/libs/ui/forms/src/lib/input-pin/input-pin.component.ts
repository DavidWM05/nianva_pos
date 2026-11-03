import { ChangeDetectionStrategy, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { CampoBase } from '../campo/campo-base';

@Component({
  selector: 'ui-input-pin',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputPinComponent), multi: true }],
  templateUrl: './input-pin.component.html',
  styleUrl: './input-pin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPinComponent extends CampoBase {
  readonly longitud = input(4);
  readonly completo = output<string>();

  protected readonly digitos = signal('');
  protected readonly longitudEfectiva = computed(() => Math.max(4, Math.min(6, this.longitud())));
  protected readonly puntos = computed(() => '•'.repeat(this.digitos().length));
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  writeValue(valor: unknown): void {
    const digitos = String(valor ?? '').replace(/\D/g, '').slice(0, this.longitudEfectiva());

    this.digitos.set(digitos);
  }

  limpiar(): void {
    this.digitos.set('');
    this.notificar('');
  }

  protected alTeclado(evento: KeyboardEvent): void {
    if (this.deshabilitado()) {
      return;
    }

    if (/^\d$/.test(evento.key)) {
      evento.preventDefault();
      this.agregar(evento.key);
      return;
    }

    if (evento.key === 'Backspace' || evento.key === 'Delete') {
      evento.preventDefault();
      this.borrar();
      return;
    }

    if (evento.key === 'Enter') {
      this.tocar();
      return;
    }

    if (evento.key.length === 1) {
      evento.preventDefault();
    }
  }

  protected alEntrada(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const digitos = entrada.value.replace(/\D/g, '').slice(0, this.longitudEfectiva());

    if (digitos !== this.digitos()) {
      this.digitos.set(digitos);
      this.notificar(digitos);
      this.completarSiCorresponde(digitos);
    }
    entrada.value = this.puntos();
  }

  protected agregar(digito: string): void {
    if (this.deshabilitado() || this.digitos().length >= this.longitudEfectiva()) {
      return;
    }

    const digitos = `${this.digitos()}${digito}`;
    this.digitos.set(digitos);
    this.notificar(digitos);
    this.completarSiCorresponde(digitos);
  }

  protected borrar(): void {
    if (this.deshabilitado() || this.digitos().length === 0) {
      return;
    }

    const digitos = this.digitos().slice(0, -1);
    this.digitos.set(digitos);
    this.notificar(digitos);
  }

  protected alSalir(): void {
    this.tocar();
  }

  private completarSiCorresponde(digitos: string): void {
    if (digitos.length === this.longitudEfectiva()) {
      this.completo.emit(digitos);
    }
  }
}
