import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  BotonCrearComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { CampoComponent } from '@nianva/ui-forms';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import {
  ConfirmDialogService,
  DataTableLazyEvent,
  ToastService,
} from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';
import { ProductoService } from '../../producto.service';
import { Producto, ProductosPermisos } from '../../producto.types';

interface FilaProducto extends Producto {
  categoriaTexto: string;
  departamentoTexto: string;
}

const PERMISOS_VACIOS: ProductosPermisos = {
  crear: false,
  editar: false,
  eliminar: false,
};

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
  imports: [
    FormsModule,
    BotonCrearComponent,
    CampoComponent,
    FilterBarComponent,
    PageComponent,
    PageHeaderComponent,
    TablaComponent,
  ],
  templateUrl: './productos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosListComponent {
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ProductosPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();
  protected readonly estado = computed(() =>
    this.primeraCarga() && this.loading()
      ? 'cargando'
      : this.error()
        ? 'error'
        : 'listo',
  );
  protected readonly hayFiltros = computed(() => this.busqueda().length > 0);
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page:
      Math.floor(this.ultimoEvento().first / (this.ultimoEvento().rows || 25)) +
      1,
    rows: this.ultimoEvento().rows || 25,
    filtros_aplicados: { filtro_nombre: this.busqueda() },
    permisos: { ...this.permisos() },
  }));
  protected readonly filaInactiva = (fila: Producto) => !fila.activo;
  protected readonly filas = computed<FilaProducto[]>(() =>
    this.productos().map((p) => ({
      ...p,
      categoriaTexto: p.categoria?.nombre ?? '—',
      departamentoTexto: p.departamento?.nombre ?? '—',
    })),
  );
  protected readonly columnas: ColumnaListado<FilaProducto>[] = [
    {
      tipo: 'principal',
      campo: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
    },
    { tipo: 'texto', campo: 'categoriaTexto', encabezado: 'Categoría' },
    { tipo: 'texto', campo: 'departamentoTexto', encabezado: 'Departamento' },
    {
      tipo: 'dinero',
      campo: 'precio_venta',
      encabezado: 'Precio de venta',
      ordenable: true,
    },
    {
      tipo: 'cantidad',
      campo: 'stock_total',
      encabezado: 'Stock',
      ordenable: true,
    },
    {
      tipo: 'acciones',
      acciones: () => {
        const acciones: AccionFila[] = [];
        if (this.permisos().editar) acciones.push({ tipo: 'editar' });
        if (this.permisos().eliminar)
          acciones.push({ tipo: 'estado', activo: true });
        return acciones;
      },
    },
  ];

  constructor() {
    this.busquedaSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.cargar({ ...this.ultimoEvento(), first: 0 }));
    this.cargar(this.ultimoEvento());
  }

  onBuscarInput(texto: string): void {
    this.busqueda.set(texto);
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  onCambio(evento: CambioListado): void {
    this.onLazyLoad({
      first: (evento.page - 1) * evento.rows,
      rows: evento.rows,
      sortField: evento.sortField,
      sortOrder:
        evento.sortOrder === 'asc'
          ? 1
          : evento.sortOrder === 'desc'
            ? -1
            : null,
      filters: {},
    });
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.busquedaSubject.next('');
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  reintentar(): void {
    this.cargar(this.ultimoEvento());
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);
    this.productoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.productos.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.primeraCarga.set(false);
        this.error.set(true);
      },
    });
  }

  irADetalle(producto: Producto): void {
    this.router.navigate(['/inventario/productos', producto.id]);
  }

  onAccion(fila: Producto, accion: AccionEmitida): void {
    if (accion.tipo === 'editar') this.irADetalle(fila);
    if (accion.tipo === 'estado') void this.onDesactivar(fila);
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
        this.cargar(this.ultimoEvento());
      },
      error: () => this.toast.error('No se pudo desactivar el producto.'),
    });
  }
}
