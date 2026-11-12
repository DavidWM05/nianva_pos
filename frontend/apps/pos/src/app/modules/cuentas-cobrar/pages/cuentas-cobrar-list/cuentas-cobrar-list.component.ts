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
import { MatCheckbox } from '@angular/material/checkbox';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { CuentaCobrarService } from '../../cuenta-cobrar.service';
import { CuentaCobrar, EstadoCuentaCobrar } from '../../cuenta-cobrar.types';

const ESTADOS: { label: string; value: EstadoCuentaCobrar | null }[] = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Pagadas', value: 'pagada' },
  { label: 'Anuladas', value: 'anulada' },
];

type FilaSaldo = CuentaCobrar & { clienteTexto: string; venceTexto: string };

@Component({
  selector: 'nucleo-cuentas-cobrar-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PageComponent,
    FilterBarComponent,
    TablaComponent,
    CampoComponent,
    SelectFiltroComponent,
    MatCheckbox,
    FormsModule,
  ],
  providers: [FechaPipe],
  templateUrl: './cuentas-cobrar-list.component.html',
  styleUrl: './cuentas-cobrar-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasCobrarListComponent {
  private readonly cuentaCobrarService = inject(CuentaCobrarService);
  private readonly router = inject(Router);

  protected readonly estados = ESTADOS;

  protected readonly cuentas = signal<CuentaCobrar[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly estadoFiltro = signal<EstadoCuentaCobrar | null>(null);
  protected readonly clienteFiltro = signal('');
  protected readonly soloVencidas = signal(false);

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly clienteSubject = new Subject<string>();

  constructor() {
    this.clienteSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((texto) => {
        this.clienteFiltro.set(texto);
        this.cargar({ ...this.ultimoEvento(), first: 0 });
      });
    this.cargar(this.ultimoEvento());
  }

  onClienteInput(texto: string): void {
    this.clienteSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoCuentaCobrar | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onVencidasCambio(vencidas: boolean): void {
    this.soloVencidas.set(vencidas);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(cuenta: CuentaCobrar): void {
    this.router.navigate(['/cuentas-cobrar', cuenta.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.cuentaCobrarService
      .listar(evento, {
        clienteNombre: this.clienteFiltro(),
        estado: this.estadoFiltro(),
        vencidas: this.soloVencidas(),
      })
      .subscribe({
        next: (respuesta) => {
          this.cuentas.set(respuesta.data);
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
    this.cuentas().map((fila) => ({
      ...fila,
      clienteTexto: fila.cliente?.nombre ?? 'Sin cliente',
      venceTexto: fila.fecha_vencimiento
        ? this.fecha.transform(fila.fecha_vencimiento) +
          (fila.estado === 'pendiente' && fila.dias_vencida > 0
            ? ' (vencida hace ' + fila.dias_vencida + 'd)'
            : '')
        : 'Sin definir',
    })),
  );
  protected readonly columnas: ColumnaListado<FilaSaldo>[] = [
    { tipo: 'principal', campo: 'clienteTexto', encabezado: 'Cliente' },
    { tipo: 'dinero', campo: 'monto_total', encabezado: 'Monto total' },
    { tipo: 'dinero', campo: 'saldo_pendiente', encabezado: 'Saldo pendiente' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'cuentaCobrar',
    },
    {
      tipo: 'texto',
      campo: 'venceTexto',
      encabezado: 'Vence',
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
      sortField:
        evento.sortField === 'venceTexto'
          ? 'fecha_vencimiento'
          : evento.sortField,
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
    Boolean(this.clienteFiltro() || this.estadoFiltro() || this.soloVencidas()),
  );

  limpiarFiltros(): void {
    this.clienteFiltro.set('');
    this.estadoFiltro.set(null);
    this.soloVencidas.set(false);
    this.clienteSubject.next('');
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }
}
