import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  ConfirmDialogService,
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  StatusBadgeComponent,
  ToastService,
} from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime } from 'rxjs';

import { CategoriaService } from '../../categoria.service';
import { Categoria, CategoriasPermisos } from '../../categoria.types';

const PERMISOS_VACIOS: CategoriasPermisos = { crear: false, editar: false, eliminar: false };

/**
 * "Nueva categoría"/"Editar" navegan a /inventario/categorias/nuevo /
 * /inventario/categorias/:id (vistas dedicadas, ver CategoriaCrearComponent
 * / CategoriaDetalleComponent) -- mismo criterio de Fase B, nunca un modal.
 */
@Component({
  selector: 'nucleo-categorias-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './categorias-list.component.html',
  styleUrl: './categorias-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasListComponent {
  private readonly categoriaService = inject(CategoriaService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'descripcion', header: 'Descripción' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<CategoriasPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.categoriaService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.categorias.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(categoria: Categoria): void {
    this.router.navigate(['/inventario/categorias', categoria.id]);
  }

  async onDesactivar(categoria: Categoria): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar la categoría "${categoria.nombre}"?`,
      header: 'Desactivar categoría',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.categoriaService.desactivar(categoria.id).subscribe({
      next: () => {
        this.toast.success('Categoría desactivada.');
        this.cargar(this.ultimoEvento);
      },
      error: () => this.toast.error('No se pudo desactivar la categoría.'),
    });
  }
}
