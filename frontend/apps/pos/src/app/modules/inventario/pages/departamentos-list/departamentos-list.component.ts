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
import { DepartamentoService } from '../../departamento.service';
import { Departamento, DepartamentosPermisos } from '../../departamento.types';

const PERMISOS_VACIOS: DepartamentosPermisos = {
  crear: false,
  editar: false,
  eliminar: false,
};

/**
 * "Nuevo departamento"/"Editar" navegan a /inventario/departamentos/nuevo /
 * /inventario/departamentos/:id (vistas dedicadas, ver
 * DepartamentoCrearComponent / DepartamentoDetalleComponent) -- mismo
 * criterio de Fase B, nunca un modal.
 */
@Component({
  selector: 'nucleo-departamentos-list',
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
  templateUrl: './departamentos-list.component.html',
  styleUrl: './departamentos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentosListComponent {
  private readonly departamentoService = inject(DepartamentoService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  protected readonly departamentos = signal<Departamento[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<DepartamentosPermisos>(PERMISOS_VACIOS);
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
  protected readonly filaInactiva = (fila: Departamento) => !fila.activo;
  protected readonly columnas: ColumnaListado<Departamento>[] = [
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
    this.departamentoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.departamentos.set(respuesta.data);
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

  irADetalle(departamento: Departamento): void {
    this.router.navigate(['/inventario/departamentos', departamento.id]);
  }

  onAccion(fila: Departamento, accion: AccionEmitida): void {
    if (accion.tipo === 'editar') this.irADetalle(fila);
    if (accion.tipo === 'estado') void this.onDesactivar(fila);
  }

  async onDesactivar(departamento: Departamento): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: '¿Desactivar el departamento "' + departamento.nombre + '"?',
      header: 'Desactivar departamento',
      severity: 'danger',
    });
    if (!confirmado) return;
    this.departamentoService.desactivar(departamento.id).subscribe({
      next: () => {
        this.toast.success('Departamento desactivado.');
        this.cargar(this.ultimoEvento());
      },
      error: () => this.toast.error('No se pudo desactivar el departamento.'),
    });
  }
}
