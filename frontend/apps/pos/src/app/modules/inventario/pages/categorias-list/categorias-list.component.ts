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
import { CategoriaService } from '../../categoria.service';
import { Categoria, CategoriasPermisos } from '../../categoria.types';

const PERMISOS_VACIOS: CategoriasPermisos = {
  crear: false,
  editar: false,
  eliminar: false,
};

/**
 * "Nueva categoría"/"Editar" navegan a /inventario/categorias/nuevo /
 * /inventario/categorias/:id (vistas dedicadas, ver CategoriaCrearComponent
 * / CategoriaDetalleComponent) -- mismo criterio de Fase B, nunca un modal.
 */
@Component({
  selector: 'nucleo-categorias-list',
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
  templateUrl: './categorias-list.component.html',
  styleUrl: './categorias-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasListComponent {
  private readonly categoriaService = inject(CategoriaService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<CategoriasPermisos>(PERMISOS_VACIOS);
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
  protected readonly filaInactiva = (fila: Categoria) => !fila.activo;
  protected readonly columnas: ColumnaListado<Categoria>[] = [
    {
      tipo: 'principal',
      campo: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
    },
    { tipo: 'texto', campo: 'descripcion', encabezado: 'Descripción' },
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
    this.categoriaService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.categorias.set(respuesta.data);
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

  irADetalle(categoria: Categoria): void {
    this.router.navigate(['/inventario/categorias', categoria.id]);
  }

  onAccion(fila: Categoria, accion: AccionEmitida): void {
    if (accion.tipo === 'editar') this.irADetalle(fila);
    if (accion.tipo === 'estado') void this.onDesactivar(fila);
  }

  async onDesactivar(categoria: Categoria): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: '¿Desactivar la categoría "' + categoria.nombre + '"?',
      header: 'Desactivar categoría',
      severity: 'danger',
    });
    if (!confirmado) return;
    this.categoriaService.desactivar(categoria.id).subscribe({
      next: () => {
        this.toast.success('Categoría desactivada.');
        this.cargar(this.ultimoEvento());
      },
      error: () => this.toast.error('No se pudo desactivar la categoría.'),
    });
  }
}
