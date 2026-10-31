import { DatePipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuditLogEntry, DataTableCellDirective, DataTableColumn, DataTableComponent, DataTableLazyEvent, StatusBadgeComponent } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';

import { UsuarioAdmin } from '../../../administracion/usuario.types';
import { UsuarioAdminService } from '../../../administracion/usuario-admin.service';
import { AuditoriaGlobalFiltros } from '../../auditoria-global.types';
import { AuditoriaGlobalService } from '../../auditoria-global.service';

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
  imports: [
    FormsModule,
    DatePipe,
    KeyValuePipe,
    DataTableComponent,
    DataTableCellDirective,
    StatusBadgeComponent,
    Select,
    DatePicker,
    Button,
    Dialog,
  ],
  templateUrl: './auditoria-global.component.html',
  styleUrl: './auditoria-global.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaGlobalComponent implements OnInit {
  private readonly auditoriaService = inject(AuditoriaGlobalService);
  private readonly usuarioService = inject(UsuarioAdminService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'fecha', header: 'Fecha' },
    { field: 'tabla_afectada', header: 'Tabla' },
    { field: 'registro_id', header: 'Registro' },
    { field: 'accion', header: 'Acción' },
    { field: 'usuario_nombre', header: 'Usuario' },
    { field: 'cambios', header: '' },
  ];

  protected readonly entradas = signal<AuditLogEntry[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly tablas = signal<string[]>([]);
  protected usuarios: UsuarioAdmin[] = [];

  protected readonly filtroTabla = signal<string | null>(null);
  protected readonly filtroUsuarioId = signal<number | null>(null);
  protected readonly filtroFechaDesde = signal<Date | null>(null);
  protected readonly filtroFechaHasta = signal<Date | null>(null);

  protected readonly entradaSeleccionada = signal<AuditLogEntry | null>(null);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  ngOnInit(): void {
    this.usuarioService.listarTodos().subscribe((usuarios) => (this.usuarios = usuarios));
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  onFiltrar(): void {
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    const filtros: AuditoriaGlobalFiltros = {
      tabla: this.filtroTabla() ?? undefined,
      usuario_id: this.filtroUsuarioId() ?? undefined,
      fecha_desde: this.aFechaIso(this.filtroFechaDesde()),
      fecha_hasta: this.aFechaIso(this.filtroFechaHasta()),
    };

    this.auditoriaService.listar(evento, filtros).subscribe({
      next: (respuesta) => {
        this.entradas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.tablas.set(respuesta.tablas);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private aFechaIso(fecha: Date | null): string | undefined {
    return fecha ? fecha.toISOString().slice(0, 10) : undefined;
  }

  verCambios(entrada: AuditLogEntry): void {
    this.entradaSeleccionada.set(entrada);
  }

  cerrarCambios(): void {
    this.entradaSeleccionada.set(null);
  }
}
