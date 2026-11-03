import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { CantidadPipe } from '@nianva/ui-format';

import { MetaListado } from './listado.types';

@Component({
  selector: 'ui-filter-bar',
  standalone: true,
  imports: [ButtonDirective, CantidadPipe],
  template: `
    <div class="ui-filter-bar">
      <div class="ui-filter-bar__filtros">
        <ng-content />
      </div>
      <div class="ui-filter-bar__resumen">
        <span>
          Mostrando {{ inicio() | cantidad }}–{{ fin() | cantidad }} de {{ total() | cantidad }}
        </span>
        @if (hayFiltros()) {
          <button pButton type="button" severity="secondary" [text]="true" (click)="limpiar.emit()">
            <i class="pi pi-filter-slash" aria-hidden="true"></i>
            <span>Limpiar</span>
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBarComponent {
  readonly meta = input<MetaListado | null>(null);
  readonly hayFiltros = input(false);
  readonly limpiar = output<void>();

  protected readonly total = () => this.meta()?.total ?? 0;
  protected readonly inicio = () => {
    const meta = this.meta();
    return meta === null || meta.total === 0 ? 0 : (meta.page - 1) * meta.rows + 1;
  };
  protected readonly fin = () => {
    const meta = this.meta();
    return meta === null ? 0 : Math.min(meta.total, meta.page * meta.rows);
  };
}
