import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent } from '@nianva/ui-shared';
import { Button } from 'primeng/button';

import { RecetaService, RecetasPermisos } from '../../receta.service';
import { Receta } from '../../receta.types';

const PERMISOS_VACIOS: RecetasPermisos = { crear: false };

/** Sin recetasShow()/recetasUpdate() -- solo lista + alta (pages/receta-form). */
@Component({
  selector: 'nucleo-recetas-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, Button],
  templateUrl: './recetas-list.component.html',
  styleUrl: './recetas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetasListComponent {
  private readonly recetaService = inject(RecetaService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'variante_id', header: 'Variante' },
    { field: 'rendimiento', header: 'Rendimiento' },
    { field: 'ingredientes', header: 'Ingredientes' },
  ];

  protected readonly recetas = signal<Receta[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<RecetasPermisos>(PERMISOS_VACIOS);

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.loading.set(true);

    this.recetaService.listar(evento).subscribe({
      next: (respuesta) => {
        this.recetas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
