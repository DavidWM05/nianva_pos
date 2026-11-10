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
import { AccionEmitida, BotonCrearComponent } from '@nianva/ui-actions';
import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { CampoComponent } from '@nianva/ui-forms';
import { FechaPipe } from '@nianva/ui-format';
import {
  EstadoPagina,
  PageComponent,
  SectionComponent,
} from '@nianva/ui-layout';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { ReglaPrecioService } from '../../regla-precio.service';
import { ReglaPrecio, ReglasPrecioPermisos } from '../../regla-precio.types';

interface Fila extends ReglaPrecio {
  tipoTexto: string;
  aplicaTexto: string;
  vigenciaTexto: string;
}

const PERMISOS_VACIOS: ReglasPrecioPermisos = {
  crear: false,
  editar: false,
  eliminar: false,
};

/**
 * "Nueva regla"/"Editar" navegan a /precios/reglas/nuevo /
 * /precios/reglas/:id (vistas dedicadas, ver ReglaPrecioCrearComponent /
 * ReglaPrecioDetalleComponent) -- ya no son modales (ver el reporte del
 * punto 1). El detalle ya trae su propio tab de Auditoria, asi que el
 * boton "Ver historial" que abria un modal aparte con
 * AuditLogViewerComponent se retiro (era una segunda puerta al mismo
 * dato) -- ver el reporte para el detalle de esta decision.
 */
@Component({
  selector: 'nucleo-reglas-precio-list',
  standalone: true,
  imports: [
    BotonCrearComponent,
    CampoComponent,
    FilterBarComponent,
    FormsModule,
    PageComponent,
    SectionComponent,
    TablaComponent,
  ],
  providers: [FechaPipe],
  templateUrl: './reglas-precio-list.component.html',
  styleUrl: './reglas-precio-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReglasPrecioListComponent {
  private readonly reglaPrecioService = inject(ReglaPrecioService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columnas: ColumnaListado<Fila>[] = [
    {
      tipo: 'principal',
      campo: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
    },
    { tipo: 'texto', campo: 'tipoTexto', encabezado: 'Tipo' },
    { tipo: 'texto', campo: 'aplicaTexto', encabezado: 'Aplica a' },
    { tipo: 'texto', campo: 'vigenciaTexto', encabezado: 'Vigencia' },
    {
      tipo: 'acciones',
      acciones: () => [
        ...(this.permisos().editar ? [{ tipo: 'editar' as const }] : []),
        ...(this.permisos().eliminar
          ? [{ tipo: 'estado' as const, activo: true }]
          : []),
      ],
    },
  ];

  protected readonly reglas = signal<ReglaPrecio[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ReglasPrecioPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();

  private readonly fecha = inject(FechaPipe);
  protected readonly error = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly filas = computed<Fila[]>(() =>
    this.reglas().map((fila) => ({
      ...fila,
      tipoTexto: {
        porcentaje: 'Porcentaje',
        monto_fijo: 'Monto fijo',
        nxm: 'NxM',
        bundle: 'Bundle',
      }[fila.tipo],
      aplicaTexto: this.etiquetaAplicaA(fila),
      vigenciaTexto: this.vigencia(fila.fecha_inicio, fila.fecha_fin),
    })),
  );
  protected readonly esInactiva = (fila: Fila): boolean => !fila.activo;
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page: Math.floor(this.ultimoEvento().first / this.ultimoEvento().rows) + 1,
    rows: this.ultimoEvento().rows,
    filtros_aplicados: { filtro_nombre: this.busqueda() },
    permisos: { ...this.permisos() },
  }));
  protected readonly estadoPagina = computed<EstadoPagina>(() =>
    this.primeraCarga() ? 'cargando' : this.error() ? 'error' : 'listo',
  );

  protected vigencia(inicio: string | null, fin: string | null): string {
    return inicio || fin
      ? (inicio ? this.fecha.transform(inicio) : '…') +
          ' – ' +
          (fin ? this.fecha.transform(fin) : '…')
      : 'Indefinida';
  }

  protected onCambio(cambio: CambioListado): void {
    this.onLazyLoad({
      first: (cambio.page - 1) * cambio.rows,
      rows: cambio.rows,
      sortField: cambio.sortField,
      sortOrder:
        cambio.sortOrder === 'desc'
          ? -1
          : cambio.sortOrder === 'asc'
            ? 1
            : null,
      filters: {},
    });
  }
  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.busquedaSubject.next('');
  }
  protected reintentar(): void {
    this.cargar(this.ultimoEvento());
  }
  protected onAccion(fila: Fila, accion: AccionEmitida): void {
    if (accion.tipo === 'editar') this.irADetalle(fila);
    if (accion.tipo === 'estado') void this.onDesactivar(fila);
  }

  constructor() {
    this.busquedaSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((texto) => {
        this.busqueda.set(texto);
        this.cargar({ ...this.ultimoEvento(), first: 0 });
      });
    this.cargar(this.ultimoEvento());
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.reglaPrecioService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.reglas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.primeraCarga.set(false);
      },
    });
  }

  protected etiquetaAplicaA(regla: ReglaPrecio): string {
    switch (regla.aplica_a) {
      case 'todo':
        return 'Todo el catálogo';
      case 'categoria':
        return regla.categoria?.nombre ?? '—';
      case 'producto':
        return regla.producto?.nombre ?? '—';
      case 'variante': {
        const v = regla.variante;
        if (!v) return '—';
        const detalle = [v.talla, v.color].filter((x) => !!x).join(' / ');
        return detalle
          ? `${v.producto_nombre} (${detalle})`
          : (v.producto_nombre ?? '—');
      }
    }
  }

  irADetalle(regla: ReglaPrecio): void {
    this.router.navigate(['/precios/reglas', regla.id]);
  }

  async onDesactivar(regla: ReglaPrecio): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar la regla "${regla.nombre}"?`,
      header: 'Desactivar regla de precio',
      severity: 'danger',
    });

    if (confirmado) {
      this.reglaPrecioService.desactivar(regla.id).subscribe({
        next: () => {
          this.toast.success('Regla desactivada.');
          this.cargar(this.ultimoEvento());
        },
        error: () => this.toast.error('No se pudo desactivar la regla.'),
      });
    }
  }
}
