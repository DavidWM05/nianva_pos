import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { FechaPipe } from '@nianva/ui-format';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DataTableLazyEvent,
  EntidadSelectorComponent,
} from '@nianva/ui-shared';

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
type FilaSaldo = NotaCredito & { clienteTexto: string; venceTexto: string };

@Component({
  selector: 'nucleo-notas-credito-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PageComponent,
    FilterBarComponent,
    TablaComponent,
    EntidadSelectorComponent,
  ],
  providers: [FechaPipe],
  templateUrl: './notas-credito-list.component.html',
  styleUrl: './notas-credito-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotasCreditoListComponent {
  private readonly notaCreditoService = inject(NotaCreditoService);
  private readonly router = inject(Router);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);

  protected readonly notas = signal<NotaCredito[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly clienteFiltroId = signal<number | null>(null);

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });

  constructor() {
    this.cargar(this.ultimoEvento());
  }

  onClienteSeleccionado(clienteId: number | null): void {
    this.clienteFiltroId.set(clienteId);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(nota: NotaCredito): void {
    this.router.navigate(['/notas-credito', nota.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.notaCreditoService
      .listar(evento, { clienteId: this.clienteFiltroId() })
      .subscribe({
        next: (respuesta) => {
          this.notas.set(respuesta.data);
          this.total.set(respuesta.total);
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

  private readonly fecha = inject(FechaPipe);
  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly estado = computed(() =>
    this.primeraCarga() && this.loading()
      ? 'cargando'
      : this.error()
        ? 'error'
        : 'listo',
  );
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page:
      Math.floor(this.ultimoEvento().first / (this.ultimoEvento().rows || 25)) +
      1,
    rows: this.ultimoEvento().rows || 25,
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly filas = computed<FilaSaldo[]>(() =>
    this.notas().map((fila) => ({
      ...fila,
      clienteTexto: fila.cliente?.nombre ?? 'Sin cliente',
      venceTexto: fila.fecha_expiracion
        ? this.fecha.transform(fila.fecha_expiracion)
        : 'Sin definir',
    })),
  );
  protected readonly columnas: ColumnaListado<FilaSaldo>[] = [
    { tipo: 'principal', campo: 'clienteTexto', encabezado: 'Cliente' },
    { tipo: 'dinero', campo: 'monto_original', encabezado: 'Monto original' },
    {
      tipo: 'dinero',
      campo: 'saldo_disponible',
      encabezado: 'Saldo disponible',
    },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'notaCredito',
    },
    { tipo: 'texto', campo: 'venceTexto', encabezado: 'Vence' },
    {
      tipo: 'fechaHora',
      campo: 'created_at',
      encabezado: 'Creada',
      ordenable: true,
    },
    { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] },
  ];

  reintentar(): void {
    this.cargar(this.ultimoEvento());
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

  protected readonly hayFiltros = computed(() =>
    Boolean(this.clienteFiltroId()),
  );

  limpiarFiltros(): void {
    this.clienteFiltroId.set(null);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }
}
