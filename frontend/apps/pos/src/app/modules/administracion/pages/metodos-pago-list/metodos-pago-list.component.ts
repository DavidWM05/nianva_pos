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
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './metodos-pago-list.component.html',
  styleUrl: './metodos-pago-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetodosPagoListComponent {
  private readonly metodoPagoService = inject(MetodoPagoAdminService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'tipo', header: 'Tipo', sortable: true },
    { field: 'incluir_en_financiero', header: 'En corte financiero' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly metodosPago = signal<MetodoPagoAdmin[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<MetodosPagoPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  protected etiquetaTipo(metodoPago: MetodoPagoAdmin): string {
    return ETIQUETAS_TIPO[metodoPago.tipo] ?? metodoPago.tipo;
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

    this.metodoPagoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.metodosPago.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(metodoPago: MetodoPagoAdmin): void {
    this.router.navigate(['/metodos-pago', metodoPago.id]);
  }

  async onDesactivar(metodoPago: MetodoPagoAdmin): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar el método de pago "${metodoPago.nombre}"?`,
      header: 'Desactivar método de pago',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.metodoPagoService.desactivar(metodoPago.id).subscribe({
      next: () => {
        this.toast.success('Método de pago desactivado.');
        this.cargar(this.ultimoEvento);
      },
      error: () => this.toast.error('No se pudo desactivar el método de pago.'),
    });
  }
}
