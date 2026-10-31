import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  ConfirmDialogService,
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  StatusBadgeComponent,
  ToastService,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime } from 'rxjs';

import { ReglaPrecioService } from '../../regla-precio.service';
import { ReglaPrecio, ReglasPrecioPermisos } from '../../regla-precio.types';

const PERMISOS_VACIOS: ReglasPrecioPermisos = { crear: false, editar: false, eliminar: false };

/**
 * "Nueva regla"/"Editar" navegan a /precios/reglas/nuevo /
 * /precios/reglas/:id (vistas dedicadas, ver ReglaPrecioCrearComponent /
 * ReglaPrecioDetalleComponent) -- ya no son modales (ver el reporte del
 * punto 1). El detalle ya trae su propio tab de Auditoria, asi que el
 * boton "Ver historial" que abria un modal aparte con
 * AuditLogViewerComponent se retiro (era una segunda puerta al mismo
 * dato) -- ver el reporte para el detalle de esta decision.
 */
@Component({
  selector: 'nucleo-reglas-precio-list',
  standalone: true,
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './reglas-precio-list.component.html',
  styleUrl: './reglas-precio-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReglasPrecioListComponent {
  private readonly reglaPrecioService = inject(ReglaPrecioService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'tipo', header: 'Tipo' },
    { field: 'aplica_a', header: 'Aplica a' },
    { field: 'vigencia', header: 'Vigencia' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly reglas = signal<ReglaPrecio[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ReglasPrecioPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.reglaPrecioService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.reglas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected etiquetaAplicaA(regla: ReglaPrecio): string {
    switch (regla.aplica_a) {
      case 'todo':
        return 'Todo el catálogo';
      case 'categoria':
        return regla.categoria?.nombre ?? '—';
      case 'producto':
        return regla.producto?.nombre ?? '—';
      case 'variante': {
        const v = regla.variante;
        if (!v) return '—';
        const detalle = [v.talla, v.color].filter((x) => !!x).join(' / ');
        return detalle ? `${v.producto_nombre} (${detalle})` : (v.producto_nombre ?? '—');
      }
    }
  }

  irADetalle(regla: ReglaPrecio): void {
    this.router.navigate(['/precios/reglas', regla.id]);
  }

  async onDesactivar(regla: ReglaPrecio): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar la regla "${regla.nombre}"?`,
      header: 'Desactivar regla de precio',
      severity: 'danger',
    });

    if (confirmado) {
      this.reglaPrecioService.desactivar(regla.id).subscribe({
        next: () => {
          this.toast.success('Regla desactivada.');
          this.cargar(this.ultimoEvento);
        },
        error: () => this.toast.error('No se pudo desactivar la regla.'),
      });
    }
  }
}
