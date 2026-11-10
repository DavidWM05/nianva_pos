import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { ColumnaListado, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { CampoComponent } from '@nianva/ui-forms';
import { EstadoPagina, PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ConfirmDialogService, DataTableLazyEvent, ToastService } from '@nianva/ui-shared';
import { Subject, debounceTime } from 'rxjs';

import { MetodoPagoAdminService } from '../../metodo-pago-admin.service';
import { MetodoPagoAdmin, MetodosPagoPermisos } from '../../metodo-pago.types';

const PERMISOS_VACIOS: MetodosPagoPermisos = { crear: false, editar: false, eliminar: false };

const ETIQUETAS_TIPO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  digital: 'Digital',
  otro: 'Otro',
};

interface FilaMetodoPago extends MetodoPagoAdmin {
  tipoTexto: string;
  financieroTexto: string;
  estadoTexto: string;
  origenTexto: string;
}

/**
 * "Nuevo método de pago"/"Editar" navegan a /metodos-pago/nuevo /
 * /metodos-pago/:id (vistas dedicadas) -- mismo criterio de Fase B/C,
 * nunca un modal. "Editar" en una fila global (es_global) SI navega al
 * detalle -- ahi se ve el mismo formulario deshabilitado (visualizar),
 * igual que "Publico General" en ClientesListComponent. Solo
 * "Desactivar" se oculta para filas globales: es la unica accion que de
 * verdad rompe el catalogo compartido por todos los tenants.
 */
@Component({
  selector: 'nucleo-metodos-pago-list',
  standalone: true,
  imports: [CampoComponent, FilterBarComponent, FormsModule, MatButton, PageComponent, PageHeaderComponent, RouterLink, TablaComponent],
  templateUrl: './metodos-pago-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetodosPagoListComponent {
  private readonly metodoPagoService = inject(MetodoPagoAdminService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columnas: ColumnaListado<FilaMetodoPago>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
    { tipo: 'texto', campo: 'tipoTexto', encabezado: 'Tipo', ordenable: true },
    { tipo: 'texto', campo: 'financieroTexto', encabezado: 'En corte financiero' },
    { tipo: 'texto', campo: 'estadoTexto', encabezado: 'Estado' },
    { tipo: 'texto', campo: 'origenTexto', encabezado: 'Origen' },
    {
      tipo: 'acciones',
      acciones: (fila) => [
        ...(this.permisos().editar ? [{ tipo: 'editar' as const }] : []),
        ...(this.permisos().eliminar && fila.activo && !fila.es_global ? [{ tipo: 'estado' as const, activo: true }] : []),
      ],
    },
  ];

  protected readonly metodosPago = signal<MetodoPagoAdmin[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly permisos = signal<MetodosPagoPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();

  protected readonly filas = computed<FilaMetodoPago[]>(() =>
    this.metodosPago().map((metodoPago) => ({
      ...metodoPago,
      tipoTexto: ETIQUETAS_TIPO[metodoPago.tipo] ?? metodoPago.tipo,
      financieroTexto: metodoPago.incluir_en_financiero ? 'Sí' : 'No',
      estadoTexto: metodoPago.activo ? 'Activo' : 'Inactivo',
      origenTexto: metodoPago.es_global ? 'Global' : 'Propio',
    })),
  );
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page: Math.floor(this.ultimoEvento().first / this.ultimoEvento().rows) + 1,
    rows: this.ultimoEvento().rows,
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly hayFiltros = computed(() => this.busqueda().trim() !== '');
  protected readonly estadoPagina = computed<EstadoPagina>(() =>
    this.primeraCarga() ? 'cargando' : this.error() ? 'error' : 'listo',
  );

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento(), first: 0 });
    });
    this.cargar(this.ultimoEvento());
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  protected onCambio(cambio: { page: number; rows: number; sortField: string | null; sortOrder: 'asc' | 'desc' | null }): void {
    this.cargar({
      first: (cambio.page - 1) * cambio.rows,
      rows: cambio.rows,
      sortField: cambio.sortField,
      sortOrder: cambio.sortOrder === 'desc' ? -1 : cambio.sortOrder === 'asc' ? 1 : null,
      filters: {},
    });
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.busquedaSubject.next('');
  }

  protected onAccion(metodoPago: FilaMetodoPago, accion: { tipo: string }): void {
    if (accion.tipo === 'editar') this.router.navigate(['/metodos-pago', metodoPago.id]);
    if (accion.tipo === 'estado') void this.onDesactivar(metodoPago);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.metodoPagoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.metodosPago.set(respuesta.data);
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

  async onDesactivar(metodoPago: MetodoPagoAdmin): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar el método de pago "${metodoPago.nombre}"?`,
      header: 'Desactivar método de pago',
      severity: 'danger',
    });

    if (!confirmado) return;

    this.metodoPagoService.desactivar(metodoPago.id).subscribe({
      next: () => {
        this.toast.success('Método de pago desactivado.');
        this.cargar(this.ultimoEvento());
      },
      error: () => this.toast.error('No se pudo desactivar el método de pago.'),
    });
  }
}
