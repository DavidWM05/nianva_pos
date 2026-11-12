import { BotonCrearComponent } from '@nianva/ui-actions';
import { CambioListado, ColumnaListado, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { CampoComponent } from '@nianva/ui-forms';
import { DineroPipe, FechaPipe } from '@nianva/ui-format';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { ApartadoService } from '../../apartado.service';
import { Apartado, ApartadosListaPermisos } from '../../apartado.types';

type FilaListado = Apartado & { clienteTexto: string; avanceTexto: string; avancePorcentaje: number; vencimientoTexto: string };

const PERMISOS_VACIOS: ApartadosListaPermisos = { crear: false };

/** Umbral para marcar un apartado activo como "por vencer" en la lista. */
const DIAS_AVISO_VENCIMIENTO = 7;

/**
 * Lista de apartados -- sin creacion/edicion inline (a diferencia de
 * Cupones/Reglas de precio): "Nuevo apartado" navega a /apartados/nuevo,
 * el mismo tratamiento de pantalla completa que la venta de TPV (ver el
 * reporte), no un modal -- crear un apartado implica el mismo carrito
 * con cotizacion real que una venta, no un formulario corto.
 */
@Component({
  selector: 'nucleo-apartados-list',
  standalone: true,
  providers: [DineroPipe, FechaPipe],
  imports: [BotonCrearComponent, FilterBarComponent, TablaComponent, CampoComponent, PageComponent, PageHeaderComponent],
  templateUrl: './apartados-list.component.html',
  styleUrl: './apartados-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApartadosListComponent {
  private readonly router = inject(Router);
  private readonly apartadoService = inject(ApartadoService);


  protected readonly apartados = signal<Apartado[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ApartadosListaPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

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

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.apartadoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.apartados.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
      error: () => { this.loading.set(false); this.primeraCarga.set(false); this.error.set(true); },
    });
  }

  protected porcentajeAbonado(apartado: Apartado): number {
    const total = Number(apartado.total);
    if (total <= 0) return 0;

    return Math.min(100, Math.round((Number(apartado.total_abonado) / total) * 100));
  }

  /**
   * null para apartados que ya no estan activos -- completado/cancelado
   * no necesitan un aviso de vencimiento, ya se resolvieron.
   */
  protected estadoVencimiento(apartado: Apartado): 'vencido' | 'proximo' | null {
    if (apartado.estado !== 'activo' || !apartado.fecha_vencimiento) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const vencimiento = new Date(apartado.fecha_vencimiento);
    const diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return 'vencido';
    if (diasRestantes <= DIAS_AVISO_VENCIMIENTO) return 'proximo';

    return null;
  }
  private readonly dinero = inject(DineroPipe);
  private readonly fecha = inject(FechaPipe);
  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly estado = computed(() => this.primeraCarga() && this.loading() ? 'cargando' : this.error() ? 'error' : 'listo');
  protected readonly meta = computed<MetaListado>(() => ({ total: this.total(), page: Math.floor(this.ultimoEvento().first / (this.ultimoEvento().rows || 25)) + 1, rows: this.ultimoEvento().rows || 25, filtros_aplicados: {}, permisos: { ...this.permisos() } }));
  protected readonly filas = computed<FilaListado[]>(() => this.apartados().map(fila => ({ ...fila, clienteTexto: fila.cliente?.nombre ?? '—', avanceTexto: this.dinero.transform(fila.total_abonado) + ' / ' + this.dinero.transform(fila.total), avancePorcentaje: this.porcentajeAbonado(fila), vencimientoTexto: fila.fecha_vencimiento ? this.fecha.transform(fila.fecha_vencimiento) + (this.estadoVencimiento(fila) === 'vencido' ? ' (vencido)' : this.estadoVencimiento(fila) === 'proximo' ? ' (por vencer)' : '') : '—' })));
  protected readonly columnas: ColumnaListado<FilaListado>[] = [{ tipo: 'principal', campo: 'clienteTexto', encabezado: 'Cliente' }, { tipo: 'texto', campo: 'avanceTexto', encabezado: 'Abonado' }, { tipo: 'porcentaje', campo: 'avancePorcentaje', encabezado: 'Avance' }, { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'apartado' }, { tipo: 'texto', campo: 'vencimientoTexto', encabezado: 'Vencimiento' }, { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] }];
  reintentar(): void { this.cargar(this.ultimoEvento()); }
  onCambio(evento: CambioListado): void { this.onLazyLoad({ first: (evento.page - 1) * evento.rows, rows: evento.rows, sortField: evento.sortField, sortOrder: evento.sortOrder === 'asc' ? 1 : evento.sortOrder === 'desc' ? -1 : null, filters: {} }); }
  verFila(fila: Apartado): void { this.router.navigate(['/apartados', fila.id]); }

}
