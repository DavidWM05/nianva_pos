import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccionEmitida, BotonCrearComponent } from '@nianva/ui-actions';
import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { CampoComponent } from '@nianva/ui-forms';
import {
  EstadoPagina,
  PageComponent,
  PageHeaderComponent,
} from '@nianva/ui-layout';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { ClienteService } from '../../cliente.service';
import { Cliente, ClientesPermisos } from '../../cliente.types';

type Fila = Cliente;

const PERMISOS_VACIOS: ClientesPermisos = {
  crear: false,
  editar: false,
  eliminar: false,
};

/**
 * Primera pantalla de un modulo de negocio real -- vista de lista.
 *
 * Decision: el filtro es un campo de busqueda propio arriba de la tabla,
 * no el `filterType` de DataTableColumn -- ese campo existe en el tipo
 * pero el `#body`/`#header` de nucleo-data-table todavia no renderiza
 * ninguna fila de filtros para el (queda como deuda pre-existente del
 * componente compartido, no algo que haya que resolver para este modulo).
 * Extender esa parte de un componente que usaran los otros 8 modulos sin
 * poder verificarla en un navegador real era mas riesgo del que vale la
 * pena aqui; un input de busqueda que dispara el mismo mecanismo de
 * recarga server-side cumple el requisito igual.
 *
 * "Nuevo cliente" navega a /crm/clientes/nuevo (vista dedicada, ver
 * ClienteCrearComponent) -- ya no es un modal (ver el reporte del punto 1).
 */
@Component({
  selector: 'nucleo-clientes-list',
  standalone: true,
  imports: [
    BotonCrearComponent,
    CampoComponent,
    FilterBarComponent,
    FormsModule,
    PageComponent,
    PageHeaderComponent,
    TablaComponent,
  ],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesListComponent {
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columnas: ColumnaListado<Fila>[] = [
    {
      tipo: 'principal',
      campo: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
    },
    {
      tipo: 'texto',
      campo: 'documento_fiscal',
      encabezado: 'Documento fiscal',
    },
    { tipo: 'texto', campo: 'telefono', encabezado: 'Teléfono' },
    { tipo: 'texto', campo: 'correo', encabezado: 'Correo' },
    {
      tipo: 'acciones',
      acciones: (fila) => [
        ...(this.permisos().editar ? [{ tipo: 'editar' as const }] : []),
        ...(this.permisos().eliminar && !fila.es_sistema
          ? [{ tipo: 'estado' as const, activo: true }]
          : []),
      ],
    },
  ];

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ClientesPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();

  protected readonly error = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly filas = computed<Fila[]>(() =>
    this.clientes().map((fila) => ({ ...fila })),
  );
  protected readonly esInactiva = (fila: Fila): boolean => !fila.activo;
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page: Math.floor(this.ultimoEvento().first / this.ultimoEvento().rows) + 1,
    rows: this.ultimoEvento().rows,
    filtros_aplicados: { filtro_nombre: this.busqueda() },
    permisos: { ...this.permisos() },
  }));
  protected readonly estadoPagina = computed<EstadoPagina>(() =>
    this.primeraCarga() ? 'cargando' : this.error() ? 'error' : 'listo',
  );

  protected onCambio(cambio: CambioListado): void {
    this.onLazyLoad({
      first: (cambio.page - 1) * cambio.rows,
      rows: cambio.rows,
      sortField: cambio.sortField,
      sortOrder:
        cambio.sortOrder === 'desc'
          ? -1
          : cambio.sortOrder === 'asc'
            ? 1
            : null,
      filters: {},
    });
  }
  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.busquedaSubject.next('');
  }
  protected reintentar(): void {
    this.cargar(this.ultimoEvento());
  }
  protected onAccion(fila: Fila, accion: AccionEmitida): void {
    if (accion.tipo === 'editar') this.irADetalle(fila);
    if (accion.tipo === 'estado') void this.onDesactivar(fila);
  }

  constructor() {
    this.busquedaSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((texto) => {
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

    this.clienteService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.clientes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.primeraCarga.set(false);
      },
    });
  }

  irADetalle(cliente: Cliente): void {
    this.router.navigate(['/crm/clientes', cliente.id]);
  }

  async onDesactivar(cliente: Cliente): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar a "${cliente.nombre}"? Ya no estará disponible para nuevas ventas.`,
      header: 'Desactivar cliente',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.clienteService.desactivar(cliente.id).subscribe({
      next: () => {
        this.toast.success('Cliente desactivado.');
        this.cargar(this.ultimoEvento());
      },
      error: () => this.toast.error('No se pudo desactivar el cliente.'),
    });
  }
}
