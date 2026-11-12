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

import { CuentaPagarService } from '../../cuenta-pagar.service';
import { CuentaPagar, EstadoCuentaPagar } from '../../cuenta-pagar.types';

const ESTADOS: { label: string; value: EstadoCuentaPagar | null }[] = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Pagadas', value: 'pagada' },
  { label: 'Anuladas', value: 'anulada' },
];

type FilaSaldo = CuentaPagar & { proveedorTexto: string; venceTexto: string };

@Component({
  selector: 'nucleo-cuentas-pagar-list',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PageComponent,
    FilterBarComponent,
    TablaComponent,
    CampoComponent,
    SelectFiltroComponent,
    FormsModule,
  ],
  providers: [FechaPipe],
  templateUrl: './cuentas-pagar-list.component.html',
  styleUrl: './cuentas-pagar-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasPagarListComponent {
  private readonly cuentaPagarService = inject(CuentaPagarService);
  private readonly router = inject(Router);

  protected readonly estados = ESTADOS;

  protected readonly cuentas = signal<CuentaPagar[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly estadoFiltro = signal<EstadoCuentaPagar | null>(null);
  protected readonly proveedorFiltro = signal('');

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly proveedorSubject = new Subject<string>();

  constructor() {
    this.proveedorSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((texto) => {
        this.proveedorFiltro.set(texto);
        this.cargar({ ...this.ultimoEvento(), first: 0 });
      });
    this.cargar(this.ultimoEvento());
  }

  onProveedorInput(texto: string): void {
    this.proveedorSubject.next(texto);
  }

  onEstadoCambio(estado: EstadoCuentaPagar | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(cuenta: CuentaPagar): void {
    this.router.navigate(['/cuentas-pagar', cuenta.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.cuentaPagarService
      .listar(evento, {
        proveedorNombre: this.proveedorFiltro(),
        estado: this.estadoFiltro(),
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
      proveedorTexto: fila.proveedor?.razon_social ?? 'Sin proveedor',
      venceTexto: fila.fecha_vencimiento
        ? this.fecha.transform(fila.fecha_vencimiento)
        : 'Sin definir',
    })),
  );
  protected readonly columnas: ColumnaListado<FilaSaldo>[] = [
    { tipo: 'principal', campo: 'proveedorTexto', encabezado: 'Proveedor' },
    { tipo: 'dinero', campo: 'monto_total', encabezado: 'Monto total' },
    { tipo: 'dinero', campo: 'saldo_pendiente', encabezado: 'Saldo pendiente' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'cuentaPagar',
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
    Boolean(this.proveedorFiltro() || this.estadoFiltro()),
  );

  limpiarFiltros(): void {
    this.proveedorFiltro.set('');
    this.estadoFiltro.set(null);
    this.proveedorSubject.next('');
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }
}
