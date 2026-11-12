import { BotonCrearComponent } from '@nianva/ui-actions';
import { CambioListado, ColumnaListado, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataTableLazyEvent } from '@nianva/ui-shared';

import { DevolucionService } from '../../devolucion.service';
import { Devolucion, DevolucionesPermisos } from '../../devolucion.types';

type FilaListado = Devolucion & { ventaTexto: string; tipoTexto: string; diferenciaTexto: string };

const PERMISOS_VACIOS: DevolucionesPermisos = { crear: false };

/**
 * Sin buscador de texto (a diferencia de Ventas/Apartados) -- una
 * devolucion no tiene un campo "nombre" util para filtrar, y el volumen
 * esperado no justifica agregar un filtro por venta origen todavia (el
 * backend ya soporta `filtro_venta_id` si hiciera falta despues).
 * "Nueva devolucion/cambio" navega a /devoluciones/nueva -- mismo
 * tratamiento de pantalla completa que Venta/Apartado, no un modal.
 */
@Component({
  selector: 'nucleo-devoluciones-list',
  standalone: true,

  imports: [BotonCrearComponent, FilterBarComponent, TablaComponent, PageComponent, PageHeaderComponent],
  templateUrl: './devoluciones-list.component.html',
  styleUrl: './devoluciones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionesListComponent {
  private readonly router = inject(Router);
  private readonly devolucionService = inject(DevolucionService);


  protected readonly devoluciones = signal<Devolucion[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<DevolucionesPermisos>(PERMISOS_VACIOS);

  private readonly ultimoEvento = signal<DataTableLazyEvent>({ first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} });

  constructor() {
    this.cargar(this.ultimoEvento());
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  /** Quita el signo por texto (no aritmetica) para no perder el formato "120.00" -- negar un string numericamente lo vuelve un Number y pierde los decimales finales. */
  protected montoAbsoluto(diferencia: string): string {
    return diferencia.startsWith('-') ? diferencia.slice(1) : diferencia;
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.devolucionService.listar(evento).subscribe({
      next: (respuesta) => {
        this.devoluciones.set(respuesta.data);
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
  protected readonly filas = computed<FilaListado[]>(() => this.devoluciones().map(fila => ({ ...fila, ventaTexto: 'Venta #' + (fila.venta?.id ?? '—') + (fila.venta?.cliente_nombre ? ' — ' + fila.venta.cliente_nombre : ''), tipoTexto: fila.tipo === 'cambio' ? 'Cambio' : 'Devolución', diferenciaTexto: +fila.diferencia < 0 ? 'Reembolso' : +fila.diferencia > 0 ? 'Cobro' : 'Sin diferencia' })));
  protected readonly columnas: ColumnaListado<FilaListado>[] = [{ tipo: 'principal', campo: 'ventaTexto', encabezado: 'Venta origen' }, { tipo: 'texto', campo: 'tipoTexto', encabezado: 'Tipo' }, { tipo: 'dinero', campo: 'diferencia', encabezado: 'Diferencia' }, { tipo: 'texto', campo: 'diferenciaTexto', encabezado: 'Concepto' }, { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha', ordenable: true }, { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] }];
  reintentar(): void { this.cargar(this.ultimoEvento()); }
  onCambio(evento: CambioListado): void { this.onLazyLoad({ first: (evento.page - 1) * evento.rows, rows: evento.rows, sortField: evento.sortField, sortOrder: evento.sortOrder === 'asc' ? 1 : evento.sortOrder === 'desc' ? -1 : null, filters: {} }); }
  verFila(fila: Devolucion): void { this.router.navigate(['/devoluciones', fila.id]); }

}
