import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent, StatusBadgeComponent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime } from 'rxjs';

import { ApartadoService } from '../../apartado.service';
import { Apartado, ApartadosListaPermisos } from '../../apartado.types';

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
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './apartados-list.component.html',
  styleUrl: './apartados-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApartadosListComponent {
  private readonly apartadoService = inject(ApartadoService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'cliente', header: 'Cliente' },
    { field: 'avance', header: 'Abonado' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_vencimiento', header: 'Vencimiento' },
    { field: 'acciones', header: '' },
  ];

  protected readonly apartados = signal<Apartado[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ApartadosListaPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.apartadoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.apartados.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
}
