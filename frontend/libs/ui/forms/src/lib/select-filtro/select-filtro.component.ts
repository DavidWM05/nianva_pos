import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Select } from 'primeng/select';

import { CampoBase } from '../campo/campo-base';

export interface SelectFiltroOpcion {
  label: string;
  value: unknown;
}

@Component({
  selector: 'ui-select-filtro',
  standalone: true,
  imports: [FormsModule, Select],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectFiltroComponent), multi: true }],
  templateUrl: './select-filtro.component.html',
  styleUrl: './select-filtro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectFiltroComponent extends CampoBase {
  readonly opciones = input<readonly SelectFiltroOpcion[]>([]);

  protected readonly valor = signal<unknown>(null);
  protected readonly opcionesConTodas = computed<SelectFiltroOpcion[]>(() => [
    { label: 'Todas', value: null },
    ...this.opciones(),
  ]);

  writeValue(valor: unknown): void {
    this.valor.set(valor ?? null);
  }

  protected alCambiar(valor: unknown): void {
    this.valor.set(valor ?? null);
    this.notificar(valor ?? null);
  }
}
