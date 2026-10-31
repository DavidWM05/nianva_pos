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
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime } from 'rxjs';

import { ProductoService } from '../../producto.service';
import { Producto, ProductosPermisos } from '../../producto.types';

const PERMISOS_VACIOS: ProductosPermisos = { crear: false, editar: false, eliminar: false };

/**
 * Segundo modulo real conectado al shell, mismo esquema que
 * ClientesListComponent (Crm): input de busqueda propio (no el filtro
 * nativo de DataTableColumn, ver la decision documentada en ese modulo),
 * celdas custom para estado y stock, permisos reaccionando al meta de la
 * respuesta.
 *
 * "Nuevo producto" navega a /inventario/productos/nuevo (vista dedicada,
 * ver ProductoCrearComponent) -- ya no es un modal, producto es una
 * entidad raiz (ver el reporte del punto 1).
 */
@Component({
  selector: 'nucleo-productos-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './productos-list.component.html',
  styleUrl: './productos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosListComponent {
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'categoria', header: 'Categoría' },
    { field: 'departamento', header: 'Departamento' },
    { field: 'precio_venta', header: 'Precio de venta', sortable: true },
    { field: 'stock_total', header: 'Stock', sortable: true },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly productos = signal<Producto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ProductosPermisos>(PERMISOS_VACIOS);
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

    this.productoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.productos.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(producto: Producto): void {
    this.router.navigate(['/inventario/productos', producto.id]);
  }

  async onDesactivar(producto: Producto): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar "${producto.nombre}"? Ya no estará disponible para nuevas ventas.`,
      header: 'Desactivar producto',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.productoService.desactivar(producto.id).subscribe({
      next: () => {
        this.toast.success('Producto desactivado.');
        this.cargar(this.ultimoEvento);
      },
      error: () => this.toast.error('No se pudo desactivar el producto.'),
    });
  }
}
