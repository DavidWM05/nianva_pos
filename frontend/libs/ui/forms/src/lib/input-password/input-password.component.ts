import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { CampoBase } from '../campo/campo-base';

@Component({
  selector: 'ui-input-password',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputPasswordComponent), multi: true }],
  templateUrl: './input-password.component.html',
  styleUrl: './input-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPasswordComponent extends CampoBase {
  readonly autocomplete = input('current-password');

  protected readonly texto = signal('');
  protected readonly mostrar = signal(false);

  writeValue(valor: unknown): void {
    this.texto.set(typeof valor === 'string' ? valor : '');
  }

  protected alEntrar(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;

    this.texto.set(texto);
    this.notificar(texto);
  }

  protected alternarVisibilidad(): void {
    this.mostrar.update((valor) => ! valor);
  }

  protected alSalir(): void {
    this.tocar();
  }
}
