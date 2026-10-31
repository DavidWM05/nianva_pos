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

import { CuponService } from '../../cupon.service';
import { Cupon, CuponesPermisos } from '../../cupon.types';

const PERMISOS_VACIOS: CuponesPermisos = { crear: false, editar: false, eliminar: false };

/**
 * "Nuevo cupón"/"Editar" navegan a /precios/cupones/nuevo /
 * /precios/cupones/:id (vistas dedicadas, ver CuponCrearComponent /
 * CuponDetalleComponent) -- ya no son modales (mismo criterio que
 * ReglasPrecioListComponent, ver el reporte del punto 1).
 */
@Component({
  selector: 'nucleo-cupones-list',
  standalone: true,
  imports: [DatePipe, RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './cupones-list.component.html',
  styleUrl: './cupones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponesListComponent {
  private readonly cuponService = inject(CuponService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'codigo', header: 'Código', sortable: true },
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'tipo', header: 'Tipo' },
    { field: 'valor', header: 'Valor' },
    { field: 'vigencia', header: 'Vigencia' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly cupones = signal<Cupon[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<CuponesPermisos>(PERMISOS_VACIOS);
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

    this.cuponService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.cupones.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(cupon: Cupon): void {
    this.router.navigate(['/precios/cupones', cupon.id]);
  }

  async onDesactivar(cupon: Cupon): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar el cupón "${cupon.codigo}"?`,
      header: 'Desactivar cupón',
      severity: 'danger',
    });

    if (confirmado) {
      this.cuponService.desactivar(cupon.id).subscribe({
        next: () => {
          this.toast.success('Cupón desactivado.');
          this.cargar(this.ultimoEvento);
        },
        error: () => this.toast.error('No se pudo desactivar el cupón.'),
      });
    }
  }
}
