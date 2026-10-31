import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  EntidadSelectorComponent,
  StatusBadgeComponent,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Subject, debounceTime } from 'rxjs';

import { BUSCADOR_CLIENTE, BUSCADOR_USUARIO } from '../../../../core/buscadores-entidad.tokens';
import { PedidoService, PedidosPermisos } from '../../pedido.service';
import { EstadoPedido, Pedido } from '../../pedido.types';

const PERMISOS_VACIOS: PedidosPermisos = { crear: false };

const ESTADOS: { label: string; value: EstadoPedido | null }[] = [
  { label: 'Todos', value: null },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Preparando', value: 'preparando' },
  { label: 'En camino', value: 'en_camino' },
  { label: 'Entregados', value: 'entregado' },
  { label: 'Cancelados', value: 'cancelado' },
];

@Component({
  selector: 'nucleo-pedidos-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    DataTableComponent,
    DataTableCellDirective,
    EntidadSelectorComponent,
    StatusBadgeComponent,
    Button,
    InputText,
    Select,
  ],
  templateUrl: './pedidos-list.component.html',
  styleUrl: './pedidos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosListComponent {
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);
  protected readonly buscadorRepartidor = inject(BUSCADOR_USUARIO);
  protected readonly estados = ESTADOS;

  protected readonly columns: DataTableColumn[] = [
    { field: 'numero_pedido', header: 'Número' },
    { field: 'cliente', header: 'Cliente' },
    { field: 'repartidor', header: 'Repartidor' },
    { field: 'estado', header: 'Estado' },
    { field: 'created_at', header: 'Creado', sortable: true },
    { field: 'acciones', header: '' },
  ];

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<PedidosPermisos>(PERMISOS_VACIOS);
  protected readonly numeroFiltro = signal('');
  protected readonly estadoFiltro = signal<EstadoPedido | null>(null);
  protected readonly clienteFiltroId = signal<number | null>(null);
  protected readonly repartidorFiltroId = signal<number | null>(null);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly numeroSubject = new Subject<string>();

  constructor() {
    this.numeroSubject.pipe(debounceTime(300)).subscribe((texto) => {
      this.numeroFiltro.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onNumeroInput(texto: string): void {
    this.numeroSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoPedido | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onClienteSeleccionado(clienteId: number | null): void {
    this.clienteFiltroId.set(clienteId);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onRepartidorSeleccionado(repartidorId: number | null): void {
    this.repartidorFiltroId.set(repartidorId);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(pedido: Pedido): void {
    this.router.navigate(['/pedidos', pedido.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.pedidoService
      .listar(evento, {
        numeroPedido: this.numeroFiltro(),
        estado: this.estadoFiltro(),
        clienteId: this.clienteFiltroId(),
        repartidorId: this.repartidorFiltroId(),
      })
      .subscribe({
        next: (respuesta) => {
          this.pedidos.set(respuesta.data);
          this.total.set(respuesta.total);
          this.permisos.set(respuesta.permisos);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
