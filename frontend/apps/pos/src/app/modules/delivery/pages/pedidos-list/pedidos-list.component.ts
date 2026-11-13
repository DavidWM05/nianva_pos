import { SelectFiltroComponent } from '@nianva/ui-forms';
import { MatInput } from '@angular/material/input';
import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import {
  BotonCrearComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import { PageComponent } from '@nianva/ui-layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DataTableLazyEvent,
  EntidadSelectorComponent,
} from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import {
  BUSCADOR_CLIENTE,
  BUSCADOR_USUARIO,
} from '../../../../core/buscadores-entidad.tokens';
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
    TablaComponent,
    BotonCrearComponent,
    PageComponent,
    FormsModule,
    EntidadSelectorComponent,
    SelectFiltroComponent,
    MatInput,
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

  protected readonly columns: ColumnaListado<
    Pedido & { clienteTexto: string; repartidorTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'numero_pedido', encabezado: 'Número' },
    { tipo: 'texto', campo: 'clienteTexto', encabezado: 'Cliente' },
    { tipo: 'texto', campo: 'repartidorTexto', encabezado: 'Repartidor' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'pedido',
    },
    {
      tipo: 'fechaHora',
      campo: 'created_at',
      encabezado: 'Creado',
      ordenable: true,
    },
    { tipo: 'acciones', acciones: () => this.acciones() },
  ];

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<PedidosPermisos>(PERMISOS_VACIOS);
  protected readonly numeroFiltro = signal('');
  protected readonly estadoFiltro = signal<EstadoPedido | null>(null);
  protected readonly clienteFiltroId = signal<number | null>(null);
  protected readonly repartidorFiltroId = signal<number | null>(null);

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };
  private readonly numeroSubject = new Subject<string>();

  constructor() {
    this.cargar(this.ultimoEvento);
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
    this.errorCarga.set(false);
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
    this.pedidos().map((f) => ({
      ...f,
      clienteTexto: f.cliente?.nombre ?? 'Sin cliente',
      repartidorTexto: f.repartidor?.nombre ?? 'Sin asignar',
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

  protected acciones(): AccionFila[] {
    return [{ tipo: 'ver' }];
  }
  onAccion(fila: Pedido, accion: AccionEmitida): void {
    if (accion.tipo === 'ver') this.irADetalle(fila);
  }
}
