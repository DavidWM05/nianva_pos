import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';

import { DevolucionService } from '../../devolucion.service';
import { Devolucion, DevolucionesPermisos } from '../../devolucion.types';

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
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, Button],
  templateUrl: './devoluciones-list.component.html',
  styleUrl: './devoluciones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionesListComponent {
  private readonly devolucionService = inject(DevolucionService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'venta', header: 'Venta origen' },
    { field: 'tipo', header: 'Tipo' },
    { field: 'diferencia', header: 'Diferencia' },
    { field: 'fecha', header: 'Fecha', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly devoluciones = signal<Devolucion[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<DevolucionesPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  constructor() {
    this.cargar(this.ultimoEvento);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  /** Quita el signo por texto (no aritmetica) para no perder el formato "120.00" -- negar un string numericamente lo vuelve un Number y pierde los decimales finales. */
  protected montoAbsoluto(diferencia: string): string {
    return diferencia.startsWith('-') ? diferencia.slice(1) : diferencia;
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.devolucionService.listar(evento).subscribe({
      next: (respuesta) => {
        this.devoluciones.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
