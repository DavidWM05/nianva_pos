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
import { DineroPipe, FechaPipe, PorcentajePipe } from '@nianva/ui-format';
import {
  EstadoPagina,
  PageComponent,
  SectionComponent,
} from '@nianva/ui-layout';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { CuponService } from '../../cupon.service';
import { Cupon, CuponesPermisos } from '../../cupon.types';

interface Fila extends Cupon {
  tipoTexto: string;
  valorTexto: string;
  vigenciaTexto: string;
}

const PERMISOS_VACIOS: CuponesPermisos = {
  crear: false,
  editar: false,
  eliminar: false,
};

/**
 * "Nuevo cupón"/"Editar" navegan a /precios/cupones/nuevo /
 * /precios/cupones/:id (vistas dedicadas, ver CuponCrearComponent /
 * CuponDetalleComponent) -- ya no son modales (mismo criterio que
 * ReglasPrecioListComponent, ver el reporte del punto 1).
 */
@Component({
  selector: 'nucleo-cupones-list',
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
  providers: [DineroPipe, FechaPipe, PorcentajePipe],
  templateUrl: './cupones-list.component.html',
  styleUrl: './cupones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponesListComponent {
  private readonly cuponService = inject(CuponService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columnas: ColumnaListado<Fila>[] = [
    {
      tipo: 'principal',
      campo: 'codigo',
      encabezado: 'Código',
      ordenable: true,
    },
    { tipo: 'texto', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
    { tipo: 'texto', campo: 'tipoTexto', encabezado: 'Tipo' },
    { tipo: 'texto', campo: 'valorTexto', encabezado: 'Valor' },
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

  protected readonly cupones = signal<Cupon[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<CuponesPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();

  private readonly dinero = inject(DineroPipe);
  private readonly porcentaje = inject(PorcentajePipe);
  private readonly fecha = inject(FechaPipe);
  protected readonly error = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly filas = computed<Fila[]>(() =>
    this.cupones().map((fila) => ({
      ...fila,
      tipoTexto: fila.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo',
      valorTexto:
        fila.tipo === 'porcentaje'
          ? this.porcentaje.transform(fila.valor)
          : this.dinero.transform(fila.valor),
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

    this.cuponService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.cupones.set(respuesta.data);
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

  irADetalle(cupon: Cupon): void {
    this.router.navigate(['/precios/cupones', cupon.id]);
  }

  async onDesactivar(cupon: Cupon): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar el cupón "${cupon.codigo}"?`,
      header: 'Desactivar cupón',
      severity: 'danger',
    });

    if (confirmado) {
      this.cuponService.desactivar(cupon.id).subscribe({
        next: () => {
          this.toast.success('Cupón desactivado.');
          this.cargar(this.ultimoEvento());
        },
        error: () => this.toast.error('No se pudo desactivar el cupón.'),
      });
    }
  }
}
