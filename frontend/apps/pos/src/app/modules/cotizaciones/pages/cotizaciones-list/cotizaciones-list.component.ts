import { BotonCrearComponent } from '@nianva/ui-actions';
import { CambioListado, ColumnaListado, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { CampoComponent, SelectFiltroComponent } from '@nianva/ui-forms';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { CotizacionesPermisos, CotizacionService } from '../../cotizacion.service';
import { Cotizacion, EstadoCotizacion } from '../../cotizacion.types';

type FilaListado = Cotizacion & { clienteTexto: string };

const PERMISOS_VACIOS: CotizacionesPermisos = { crear: false, editar: false, eliminar: false, precio_manual: false };

const ESTADOS: { label: string; value: EstadoCotizacion | null }[] = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Convertidas', value: 'convertida' },
  { label: 'Vencidas', value: 'vencida' },
  { label: 'Anuladas', value: 'anulada' },
];

@Component({
  selector: 'nucleo-cotizaciones-list',
  standalone: true,

  imports: [FormsModule, SelectFiltroComponent, BotonCrearComponent, FilterBarComponent, TablaComponent, CampoComponent, PageComponent, PageHeaderComponent],
  templateUrl: './cotizaciones-list.component.html',
  styleUrl: './cotizaciones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionesListComponent {
  private readonly cotizacionService = inject(CotizacionService);
  private readonly router = inject(Router);

  protected readonly estados = ESTADOS;


  protected readonly cotizaciones = signal<Cotizacion[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<CotizacionesPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  protected readonly estadoFiltro = signal<EstadoCotizacion | null>(null);

  private readonly ultimoEvento = signal<DataTableLazyEvent>({ first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} });
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento(), first: 0 });
    });
    this.cargar(this.ultimoEvento());
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoCotizacion | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(cotizacion: Cotizacion): void {
    this.router.navigate(['/cotizaciones', cotizacion.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.cotizacionService
      .listar(evento, { numero: this.busqueda(), estado: this.estadoFiltro() ?? undefined })
      .subscribe({
        next: (respuesta) => {
          this.cotizaciones.set(respuesta.data);
          this.total.set(respuesta.total);
          this.permisos.set(respuesta.permisos);
          this.loading.set(false);
          this.primeraCarga.set(false);
        },
        error: () => { this.loading.set(false); this.primeraCarga.set(false); this.error.set(true); },
      });
  }


  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly estado = computed(() => this.primeraCarga() && this.loading() ? 'cargando' : this.error() ? 'error' : 'listo');
  protected readonly meta = computed<MetaListado>(() => ({ total: this.total(), page: Math.floor(this.ultimoEvento().first / (this.ultimoEvento().rows || 25)) + 1, rows: this.ultimoEvento().rows || 25, filtros_aplicados: {}, permisos: { ...this.permisos() } }));
  protected readonly filas = computed<FilaListado[]>(() => this.cotizaciones().map(fila => ({ ...fila, clienteTexto: fila.cliente?.nombre ?? 'Sin cliente' })));
  protected readonly columnas: ColumnaListado<FilaListado>[] = [{ tipo: 'principal', campo: 'numero_cotizacion', encabezado: 'Número' }, { tipo: 'texto', campo: 'clienteTexto', encabezado: 'Cliente' }, { tipo: 'dinero', campo: 'total', encabezado: 'Total' }, { tipo: 'fecha', campo: 'created_at', encabezado: 'Creada', ordenable: true }, { tipo: 'fecha', campo: 'fecha_vencimiento', encabezado: 'Vence' }, { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'cotizacion' }, { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] }];
  reintentar(): void { this.cargar(this.ultimoEvento()); }
  onCambio(evento: CambioListado): void { this.onLazyLoad({ first: (evento.page - 1) * evento.rows, rows: evento.rows, sortField: evento.sortField, sortOrder: evento.sortOrder === 'asc' ? 1 : evento.sortOrder === 'desc' ? -1 : null, filters: {} }); }
  verFila(fila: Cotizacion): void { this.router.navigate(['/cotizaciones', fila.id]); }

}
