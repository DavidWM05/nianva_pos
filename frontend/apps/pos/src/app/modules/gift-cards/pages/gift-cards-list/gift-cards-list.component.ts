import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { CampoComponent, SelectFiltroComponent } from '@nianva/ui-forms';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { FechaPipe } from '@nianva/ui-format';
import { BotonCrearComponent } from '@nianva/ui-actions';
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

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { GiftCardService } from '../../gift-card.service';
import { EstadoGiftCard, GiftCard } from '../../gift-card.types';

const ESTADOS: { label: string; value: EstadoGiftCard | null }[] = [
  { label: 'Activas', value: 'activa' },
  { label: 'Usadas', value: 'usada' },
  { label: 'Expiradas', value: 'expirada' },
  { label: 'Canceladas', value: 'cancelada' },
];

type FilaSaldo = GiftCard & { clienteTexto: string; venceTexto: string };

@Component({
  selector: 'nucleo-gift-cards-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PageComponent,
    FilterBarComponent,
    TablaComponent,
    CampoComponent,
    SelectFiltroComponent,
    BotonCrearComponent,
    EntidadSelectorComponent,
    FormsModule,
  ],
  providers: [FechaPipe],
  templateUrl: './gift-cards-list.component.html',
  styleUrl: './gift-cards-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiftCardsListComponent {
  private readonly giftCardService = inject(GiftCardService);
  private readonly router = inject(Router);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);
  protected readonly estados = ESTADOS;

  protected readonly giftCards = signal<GiftCard[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly estadoFiltro = signal<EstadoGiftCard | null>(null);
  protected readonly clienteFiltroId = signal<number | null>(null);
  protected readonly codigoFiltro = signal('');

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly codigoSubject = new Subject<string>();

  constructor() {
    this.codigoSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((codigo) => {
        this.codigoFiltro.set(codigo);
        this.cargar({ ...this.ultimoEvento(), first: 0 });
      });
    this.cargar(this.ultimoEvento());
  }

  onCodigoInput(codigo: string): void {
    this.codigoSubject.next(codigo);
  }

  onEstadoCambio(estado: EstadoGiftCard | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onClienteSeleccionado(clienteId: number | null): void {
    this.clienteFiltroId.set(clienteId);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(giftCard: GiftCard): void {
    this.router.navigate(['/gift-cards', giftCard.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.giftCardService
      .listar(evento, {
        clienteId: this.clienteFiltroId(),
        estado: this.estadoFiltro(),
        codigo: this.codigoFiltro(),
      })
      .subscribe({
        next: (respuesta) => {
          this.giftCards.set(respuesta.data);
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
    this.giftCards().map((fila) => ({
      ...fila,
      clienteTexto: fila.cliente?.nombre ?? 'Anónima',
      venceTexto: fila.fecha_expiracion
        ? this.fecha.transform(fila.fecha_expiracion)
        : 'Sin definir',
    })),
  );
  protected readonly columnas: ColumnaListado<FilaSaldo>[] = [
    { tipo: 'principal', campo: 'codigo', encabezado: 'Código' },
    { tipo: 'texto', campo: 'clienteTexto', encabezado: 'Cliente' },
    { tipo: 'dinero', campo: 'saldo_actual', encabezado: 'Saldo actual' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'giftCard',
    },
    { tipo: 'texto', campo: 'venceTexto', encabezado: 'Vence' },
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
    Boolean(
      this.codigoFiltro() || this.estadoFiltro() || this.clienteFiltroId(),
    ),
  );

  limpiarFiltros(): void {
    this.codigoFiltro.set('');
    this.estadoFiltro.set(null);
    this.clienteFiltroId.set(null);
    this.codigoSubject.next('');
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }
}
