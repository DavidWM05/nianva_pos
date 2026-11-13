import {
  FilterBarComponent,
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { CampoComponent, BtnEnviarComponent } from '@nianva/ui-forms';

import { ModalComponent } from '@nianva/ui-overlays';
import { MatInput } from '@angular/material/input';

import {
  BotonCrearComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfirmDialogService,
  DataTableLazyEvent,
  ToastService,
  mensajeError,
} from '@nianva/ui-shared';

import { OrdenProduccionService, OrdenesPermisos } from '../../orden.service';
import { OrdenProduccion } from '../../orden.types';

const PERMISOS_VACIOS: OrdenesPermisos = { crear: false };

/**
 * Sin ordenesShow() -- alta en dialogo sobre la misma lista (como
 * Insumos) y transiciones de estado como acciones de fila, ya que no hay
 * pantalla de detalle propia.
 */
@Component({
  selector: 'nucleo-ordenes-list',
  standalone: true,
  imports: [
    FilterBarComponent,
    TablaComponent,
    BotonCrearComponent,
    PageComponent,
    PageHeaderComponent,
    FormsModule,
    CampoComponent,
    BtnEnviarComponent,
    ModalComponent,
    MatInput,
  ],
  templateUrl: './ordenes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdenesListComponent {
  private readonly ordenService = inject(OrdenProduccionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: ColumnaListado<
    OrdenProduccion & { recetaTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'recetaTexto', encabezado: 'Receta' },
    {
      tipo: 'cantidad',
      campo: 'cantidad_programada',
      encabezado: 'Programada',
    },
    { tipo: 'cantidad', campo: 'cantidad_producida', encabezado: 'Producida' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'ordenProduccion',
    },
    {
      tipo: 'fecha',
      campo: 'fecha_programada',
      encabezado: 'Fecha programada',
    },
    { tipo: 'acciones', acciones: (fila) => this.acciones(fila) },
  ];

  protected readonly ordenes = signal<OrdenProduccion[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<OrdenesPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };

  // -- Completar orden --
  protected readonly ordenACompletar = signal<OrdenProduccion | null>(null);
  protected readonly cantidadProducida = signal<number | null>(null);
  protected readonly completando = signal(false);

  constructor() {
    this.cargar(this.ultimoEvento);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  async iniciar(orden: OrdenProduccion): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Marcar la orden #${orden.id} como en proceso?`,
      header: 'Iniciar orden',
      severity: 'info',
    });
    if (!confirmado) return;

    this.cambiarEstado(orden, 'en_proceso');
  }

  async cancelar(orden: OrdenProduccion): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Cancelar la orden #${orden.id}? Esta acción no se puede deshacer.`,
      header: 'Cancelar orden',
      severity: 'danger',
    });
    if (!confirmado) return;

    this.cambiarEstado(orden, 'cancelada');
  }

  abrirCompletar(orden: OrdenProduccion): void {
    this.ordenACompletar.set(orden);
    this.cantidadProducida.set(orden.cantidad_programada);
  }

  cerrarCompletar(): void {
    this.ordenACompletar.set(null);
  }

  confirmarCompletar(): void {
    const orden = this.ordenACompletar();
    const cantidad = this.cantidadProducida();
    if (!orden || !cantidad || cantidad <= 0) return;

    this.completando.set(true);

    this.ordenService
      .cambiarEstado(orden.id, 'completada', cantidad)
      .subscribe({
        next: () => {
          this.completando.set(false);
          this.ordenACompletar.set(null);
          this.toast.success(
            'Orden completada. Stock de insumos descontado y stock de producto actualizado.',
          );
          this.cargar(this.ultimoEvento);
        },
        error: (error: HttpErrorResponse) => {
          this.completando.set(false);
          this.toast.error(
            mensajeError(error, 'No se pudo completar la orden.'),
          );
        },
      });
  }

  private cambiarEstado(
    orden: OrdenProduccion,
    estado: 'en_proceso' | 'cancelada',
  ): void {
    this.ordenService.cambiarEstado(orden.id, estado).subscribe({
      next: () => {
        this.toast.success('Estado actualizado.');
        this.cargar(this.ultimoEvento);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(
          mensajeError(error, 'No se pudo actualizar el estado.'),
        );
      },
    });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.errorCarga.set(false);
    this.loading.set(true);

    this.ordenService.listar(evento).subscribe({
      next: (respuesta) => {
        this.ordenes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.primeraCarga.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.primeraCarga.set(false);
        this.loading.set(false);
        this.errorCarga.set(true);
      },
    });
  }

  protected readonly primeraCarga = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly estado = computed(() =>
    this.loading() && this.primeraCarga()
      ? 'cargando'
      : this.errorCarga()
        ? 'error'
        : 'listo',
  );
  protected readonly filas = computed(() =>
    this.ordenes().map((f) => ({
      ...f,
      recetaTexto: f.receta?.nombre ?? 'Sin receta',
    })),
  );
  protected get meta(): MetaListado {
    return {
      total: this.total(),
      page: Math.floor(this.ultimoEvento.first / this.ultimoEvento.rows) + 1,
      rows: this.ultimoEvento.rows,
      filtros_aplicados: {},
      permisos: {},
    };
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
  reintentar(): void {
    this.cargar(this.ultimoEvento);
  }

  protected acciones(fila: OrdenProduccion): AccionFila[] {
    if (!this.permisos().completar) return [];
    if (fila.estado !== 'pendiente' && fila.estado !== 'en_proceso') return [];
    const acciones: AccionFila[] = [];
    if (fila.estado === 'pendiente')
      acciones.push({
        tipo: 'custom',
        id: 'iniciar',
        icono: 'pi pi-play',
        descripcion: 'Iniciar',
      });
    acciones.push(
      {
        tipo: 'custom',
        id: 'completar',
        icono: 'pi pi-check',
        descripcion: 'Completar',
      },
      {
        tipo: 'custom',
        id: 'cancelar',
        icono: 'pi pi-times',
        descripcion: 'Cancelar',
      },
    );
    return acciones;
  }
  onAccion(fila: OrdenProduccion, accion: AccionEmitida): void {
    if (accion.tipo !== 'custom') return;
    if (accion.id === 'iniciar') void this.iniciar(fila);
    if (accion.id === 'completar') this.abrirCompletar(fila);
    if (accion.id === 'cancelar') void this.cancelar(fila);
  }
}
