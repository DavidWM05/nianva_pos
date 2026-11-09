import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogEntry, DataTableLazyEvent } from '@nianva/ui-shared';
import { ColumnaListado, FilterBarComponent, MetaListado, TablaComponent } from '@nianva/ui-data';
import { CampoComponent, SelectFiltroComponent } from '@nianva/ui-forms';
import { EstadoPagina, PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ModalComponent } from '@nianva/ui-overlays';

import { UsuarioAdmin } from '../../../administracion/usuario.types';
import { UsuarioAdminService } from '../../../administracion/usuario-admin.service';
import { AuditoriaGlobalFiltros } from '../../auditoria-global.types';
import { AuditoriaGlobalService } from '../../auditoria-global.service';

interface FilaAuditoria extends AuditLogEntry {
  usuarioTexto: string;
}

/**
 * Navegador global de auditoria (Fase C, punto 5) -- distinto del
 * AuditLogViewerComponent embebido por registro (ese ya existia, ver
 * ClienteDetalleComponent etc.): esta es una pantalla de administracion
 * que lista TODOS los cambios del tenant, paginada y filtrable por
 * tabla/usuario/rango de fechas. "Ver cambios" abre un dialogo liviano
 * con el diff de una entrada -- no es un sub-recurso editable, es solo
 * inspeccionar un valor que ya esta en la fila.
 */
@Component({
  selector: 'nucleo-auditoria-global',
  standalone: true,
  imports: [CampoComponent, FilterBarComponent, FormsModule, KeyValuePipe, ModalComponent, PageComponent, PageHeaderComponent, SelectFiltroComponent, TablaComponent],
  templateUrl: './auditoria-global.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaGlobalComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaGlobalService);
  private readonly usuarioService = inject(UsuarioAdminService);

  protected readonly columnas: ColumnaListado<FilaAuditoria>[] = [
    { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha' },
    { tipo: 'texto', campo: 'tabla_afectada', encabezado: 'Tabla' },
    { tipo: 'texto', campo: 'registro_id', encabezado: 'Registro' },
    { tipo: 'estado', campo: 'accion', encabezado: 'Acción', entidad: 'accionAuditoria' },
    { tipo: 'texto', campo: 'usuarioTexto', encabezado: 'Usuario' },
    {
      tipo: 'acciones',
      acciones: (fila) => fila.cambios && Object.keys(fila.cambios).length > 0 ? [{ tipo: 'custom' as const, id: 'cambios', icono: 'pi pi-eye', descripcion: 'Ver cambios' }] : [],
    },
  ];

  protected readonly entradas = signal<AuditLogEntry[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly tablas = signal<string[]>([]);
  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly filtroTabla = signal<string | null>(null);
  protected readonly filtroUsuarioId = signal<number | null>(null);
  protected readonly filtroFechaDesde = signal<string>('');
  protected readonly filtroFechaHasta = signal<string>('');
  protected readonly entradaSeleccionada = signal<AuditLogEntry | null>(null);
  // Signal y no campo: meta() depende de la pagina pedida aunque el total no cambie.
  private readonly ultimoEvento = signal<DataTableLazyEvent>({ first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} });

  protected readonly opcionesTablas = computed(() => this.tablas().map((tabla) => ({ label: tabla, value: tabla })));
  protected readonly opcionesUsuarios = computed(() => this.usuarios().map((usuario) => ({ label: usuario.nombre, value: usuario.id })));
  protected readonly meta = computed<MetaListado>(() => ({
    total: this.total(),
    page: Math.floor(this.ultimoEvento().first / this.ultimoEvento().rows) + 1,
    rows: this.ultimoEvento().rows,
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly estadoPagina = computed<EstadoPagina>(() =>
    this.primeraCarga() ? 'cargando' : this.error() ? 'error' : 'listo',
  );
  protected readonly filas = computed<FilaAuditoria[]>(() =>
    this.entradas().map((entrada) => ({ ...entrada, usuarioTexto: entrada.usuario_nombre ?? 'Sistema' })),
  );
  protected readonly hayFiltros = computed(() => this.filtroTabla() !== null || this.filtroUsuarioId() !== null || this.filtroFechaDesde() !== '' || this.filtroFechaHasta() !== '');

  ngOnInit(): void {
    this.usuarioService.listarTodos().subscribe((usuarios) => this.usuarios.set(usuarios));
    this.cargar(this.ultimoEvento());
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

  protected onAccion(entrada: FilaAuditoria, accion: { tipo: string }): void {
    if (accion.tipo === 'custom') this.verCambios(entrada);
  }

  onFiltrar(): void {
    this.cargar({ ...this.ultimoEvento(), first: 0 });
  }

  protected limpiarFiltros(): void {
    this.filtroTabla.set(null);
    this.filtroUsuarioId.set(null);
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.onFiltrar();
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);
    const filtros: AuditoriaGlobalFiltros = {
      tabla: this.filtroTabla() ?? undefined,
      usuario_id: this.filtroUsuarioId() ?? undefined,
      fecha_desde: this.filtroFechaDesde() || undefined,
      fecha_hasta: this.filtroFechaHasta() || undefined,
    };

    this.auditoriaService.listar(evento, filtros).subscribe({
      next: (respuesta) => {
        this.entradas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.tablas.set(respuesta.tablas);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
        this.primeraCarga.set(false);
      },
    });
  }

  verCambios(entrada: AuditLogEntry): void {
    this.entradaSeleccionada.set(entrada);
  }

  cerrarCambios(): void {
    this.entradaSeleccionada.set(null);
  }
}
