import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { AccionEmitida } from '@nianva/ui-actions';
import { CambioListado, ColumnaListado, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { BtnEnviarComponent, CampoComponent } from '@nianva/ui-forms';
import { FormActionsComponent, PageComponent } from '@nianva/ui-layout';
import { ModalComponent } from '@nianva/ui-overlays';
import { DataTableLazyEvent, ToastService, esErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { Venta, VentasPermisos } from '../../venta.types';
import { VentaService } from '../../venta.service';

const PERMISOS_VACIOS: VentasPermisos = { anular: false };

type FilaVenta = Venta & { clienteTexto: string; pagoTexto: string };

/**
 * Sin creacion/edicion aqui -- registrar una venta pasa por la pantalla
 * de captura (ver VentaComponent), esta lista solo consulta lo ya
 * registrado. "Ver detalle" navega a /tpv/ventas/:id (vista dedicada, ver
 * VentaDetalleComponent) -- ya no es un modal (ver el reporte del punto
 * 1). "Anular" SIGUE siendo un dialogo aqui, a proposito: no es un
 * formulario CRUD de la entidad (una venta no se "edita", solo cambia de
 * estado), es una accion puntual de una fila que pide un motivo en texto
 * -- por eso no reutiliza ConfirmDialogService (que solo soporta si/no) y
 * tiene su propio dialogo con textarea, igual que "Desactivar" en otras
 * listas usa su propio confirm().
 */
@Component({
  selector: 'nucleo-ventas-list',
  standalone: true,
  imports: [
    FormsModule,
    FilterBarComponent,
    TablaComponent,
    CampoComponent,
    BtnEnviarComponent,
    FormActionsComponent,
    PageComponent,
    ModalComponent,
  ],
  templateUrl: './ventas-list.component.html',
  styleUrl: './ventas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasListComponent {
  private readonly ventaService = inject(VentaService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly columnas: ColumnaListado<FilaVenta>[] = [
    { tipo: 'principal', campo: 'clienteTexto', encabezado: 'Cliente' },
    { tipo: 'dinero', campo: 'total', encabezado: 'Total', ordenable: true },
    { tipo: 'texto', campo: 'pagoTexto', encabezado: 'Pago' },
    { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'venta' },
    { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha', ordenable: true },
    {
      tipo: 'acciones',
      acciones: (fila) =>
        this.permisos().anular && fila.estado === 'completada' ? [{ tipo: 'ver' }, { tipo: 'anular' }] : [{ tipo: 'ver' }],
    },
  ];

  protected readonly ventas = signal<Venta[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<VentasPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  // Lo escrito en el buscador; `busqueda` toma el valor tras el debounce.
  protected readonly busquedaTexto = signal('');
  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly estado = computed(() =>
    this.primeraCarga() && this.loading() ? 'cargando' : this.error() ? 'error' : 'listo',
  );
  protected readonly filas = computed<FilaVenta[]>(() =>
    this.ventas().map((venta) => ({
      ...venta,
      clienteTexto: venta.cliente?.nombre ?? '—',
      pagoTexto: this.etiquetaMetodosPago(venta),
    })),
  );
  protected readonly meta = computed<MetaListado>(() => {
    const rows = this.ultimoEvento().rows || 25;

    return {
      total: this.total(),
      page: Math.floor(this.ultimoEvento().first / rows) + 1,
      rows,
      filtros_aplicados: this.busqueda().trim() ? { filtro_cliente: this.busqueda().trim() } : {},
      permisos: { ...this.permisos() },
    };
  });

  protected readonly ventaEnAnulacion = signal<Venta | null>(null);
  protected readonly motivoAnulacion = signal('');
  protected readonly anulando = signal(false);

  private readonly ultimoEvento = signal<DataTableLazyEvent>({ first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} });
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento(), first: 0 });
    });
    // ui-tabla no pide la primera pagina (nucleo-data-table la pedia con su lazyLoad inicial).
    this.cargar(this.ultimoEvento());
  }

  onBuscarInput(texto: string): void {
    this.busquedaTexto.set(texto);
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
      sortOrder: evento.sortOrder === 'asc' ? 1 : evento.sortOrder === 'desc' ? -1 : null,
      filters: {},
    });
  }

  reintentar(): void {
    this.cargar(this.ultimoEvento());
  }

  protected alAccion(venta: Venta, accion: AccionEmitida): void {
    if (accion.tipo === 'ver') {
      this.irADetalle(venta);
    } else if (accion.tipo === 'anular') {
      this.abrirAnulacion(venta);
    }
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.ventaService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.ventas.set(respuesta.data);
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

  protected etiquetaMetodosPago(venta: Venta): string {
    if (!venta.metodos_pago || venta.metodos_pago.length === 0) return '—';

    return venta.metodos_pago.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }

  irADetalle(venta: Venta): void {
    this.router.navigate(['/tpv/ventas', venta.id]);
  }

  abrirAnulacion(venta: Venta): void {
    this.motivoAnulacion.set('');
    this.ventaEnAnulacion.set(venta);
  }

  cerrarAnulacion(): void {
    this.ventaEnAnulacion.set(null);
  }

  confirmarAnulacion(): void {
    const venta = this.ventaEnAnulacion();
    const motivo = this.motivoAnulacion().trim();
    if (!venta || !motivo) return;

    this.anulando.set(true);

    this.ventaService.anular(venta.id, motivo).subscribe({
      next: () => {
        this.anulando.set(false);
        this.ventaEnAnulacion.set(null);
        this.toast.success('Venta anulada.');
        this.cargar(this.ultimoEvento());
      },
      error: (error: HttpErrorResponse) => {
        this.anulando.set(false);

        if (esErrorNegocio(error, 'venta_ya_anulada')) {
          this.toast.error(mensajeError(error, 'No se pudo anular la venta.'));
          this.cargar(this.ultimoEvento());

          return;
        }

        this.toast.error('No se pudo anular la venta.');
      },
    });
  }
}
