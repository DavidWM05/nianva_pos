import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent } from '@nianva/ui-shared';
import { Button } from 'primeng/button';

import { TransformacionService, TransformacionesPermisos } from '../../transformacion.service';
import { TransformacionProducto } from '../../transformacion.types';

const PERMISOS_VACIOS: TransformacionesPermisos = { crear: false };

/** Sin transformacionesShow() -- solo lista + alta (pages/transformacion-form). */
@Component({
  selector: 'nucleo-transformaciones-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, Button],
  templateUrl: './transformaciones-list.component.html',
  styleUrl: './transformaciones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransformacionesListComponent {
  private readonly transformacionService = inject(TransformacionService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'variante_origen_id', header: 'Origen' },
    { field: 'cantidad_origen', header: 'Cantidad consumida' },
    { field: 'variante_destino_id', header: 'Destino' },
    { field: 'cantidad_destino', header: 'Cantidad producida' },
    { field: 'notas', header: 'Notas' },
  ];

  protected readonly transformaciones = signal<TransformacionProducto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<TransformacionesPermisos>(PERMISOS_VACIOS);

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.loading.set(true);

    this.transformacionService.listar(evento).subscribe({
      next: (respuesta) => {
        this.transformaciones.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
