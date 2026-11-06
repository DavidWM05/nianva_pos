import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, forwardRef, input, signal } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { CampoBase } from '../campo/campo-base';

export interface SelectFiltroOpcion {
  label: string;
  value: unknown;
}

@Component({
  selector: 'ui-select-filtro',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectFiltroComponent), multi: true }],
  templateUrl: './select-filtro.component.html',
  styleUrl: './select-filtro.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectFiltroComponent extends CampoBase {
  readonly opciones = input<readonly SelectFiltroOpcion[]>([]);
  // Solo fuera de ui-campo (por ejemplo, la barra de filtros del reporte); dentro, el nombre
  // sale de la etiqueta del campo.
  readonly ariaLabel = input<string | null>(null);

  protected readonly valor = signal<unknown>(null);
  protected readonly errorCampo: ErrorStateMatcher = { isErrorState: () => this.ariaInvalido() };
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

  protected alCerrar(abierto: boolean): void {
    if (!abierto) {
      this.tocar();
    }
  }
}
