import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  EntidadSelectorComponent,
  StatusBadgeComponent,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { NotaCreditoService } from '../../nota-credito.service';
import { NotaCredito } from '../../nota-credito.types';

/**
 * Solo lectura -- ver el docblock de NotaCreditoService. No hay boton
 * "Nueva nota de credito": se generan unicamente desde una Devolucion con
 * tipo_reembolso = 'nota_credito'.
 *
 * Sin filtro de estado: NotaCreditoController::index() (backend) solo
 * acepta `filtro_cliente_id` -- no hay `filtro_estado`. Filtrarlo del lado
 * del cliente rompería la paginación (el total y las páginas siguientes
 * seguirían contando registros ya filtrados fuera de la vista), así que no
 * se agrega hasta que el backend lo soporte.
 */
@Component({
  selector: 'nucleo-notas-credito-list',
  standalone: true,
  imports: [DatePipe, DataTableComponent, DataTableCellDirective, EntidadSelectorComponent, StatusBadgeComponent, Button],
  templateUrl: './notas-credito-list.component.html',
  styleUrl: './notas-credito-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotasCreditoListComponent {
  private readonly notaCreditoService = inject(NotaCreditoService);
  private readonly router = inject(Router);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  protected readonly columns: DataTableColumn[] = [
    { field: 'cliente', header: 'Cliente' },
    { field: 'monto_original', header: 'Monto original' },
    { field: 'saldo_disponible', header: 'Saldo disponible' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_expiracion', header: 'Vence' },
    { field: 'created_at', header: 'Creada', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly notas = signal<NotaCredito[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly clienteFiltroId = signal<number | null>(null);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  onClienteSeleccionado(clienteId: number | null): void {
    this.clienteFiltroId.set(clienteId);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(nota: NotaCredito): void {
    this.router.navigate(['/notas-credito', nota.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.notaCreditoService.listar(evento, { clienteId: this.clienteFiltroId() }).subscribe({
      next: (respuesta) => {
        this.notas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
