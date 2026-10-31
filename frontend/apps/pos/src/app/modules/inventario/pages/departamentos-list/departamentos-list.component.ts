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

import { DepartamentoService } from '../../departamento.service';
import { Departamento, DepartamentosPermisos } from '../../departamento.types';

const PERMISOS_VACIOS: DepartamentosPermisos = { crear: false, editar: false, eliminar: false };

/**
 * "Nuevo departamento"/"Editar" navegan a /inventario/departamentos/nuevo /
 * /inventario/departamentos/:id (vistas dedicadas, ver
 * DepartamentoCrearComponent / DepartamentoDetalleComponent) -- mismo
 * criterio de Fase B, nunca un modal.
 */
@Component({
  selector: 'nucleo-departamentos-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './departamentos-list.component.html',
  styleUrl: './departamentos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentosListComponent {
  private readonly departamentoService = inject(DepartamentoService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'descripcion', header: 'Descripción' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly departamentos = signal<Departamento[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<DepartamentosPermisos>(PERMISOS_VACIOS);
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

    this.departamentoService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.departamentos.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(departamento: Departamento): void {
    this.router.navigate(['/inventario/departamentos', departamento.id]);
  }

  async onDesactivar(departamento: Departamento): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar el departamento "${departamento.nombre}"?`,
      header: 'Desactivar departamento',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.departamentoService.desactivar(departamento.id).subscribe({
      next: () => {
        this.toast.success('Departamento desactivado.');
        this.cargar(this.ultimoEvento);
      },
      error: () => this.toast.error('No se pudo desactivar el departamento.'),
    });
  }
}
