import { HttpErrorResponse } from '@angular/common/http';
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

import { RolService } from '../../rol.service';
import { Rol, RolesPermisos } from '../../rol.types';

const PERMISOS_VACIOS: RolesPermisos = { crear: false, editar: false, eliminar: false };

/**
 * "Nuevo rol"/"Editar" navegan a /roles/nuevo / /roles/:id (vistas
 * dedicadas, ver RolCrearComponent/RolDetalleComponent) -- mismo
 * criterio de Fase B/C. A diferencia del resto del catalogo, "Eliminar"
 * aqui es un DELETE fisico real (Rol no tiene columna `activo`) -- ver
 * el reporte: guardado en el backend por es_sistema y por "no tener
 * usuarios asignados", asi que el dialogo de confirmacion lo deja claro.
 */
@Component({
  selector: 'nucleo-roles-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListComponent {
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'descripcion', header: 'Descripción' },
    { field: 'usuarios_count', header: 'Usuarios' },
    { field: 'es_sistema', header: 'Tipo' },
    { field: 'acciones', header: '' },
  ];

  protected readonly roles = signal<Rol[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<RolesPermisos>(PERMISOS_VACIOS);
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

    this.rolService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.roles.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(rol: Rol): void {
    this.router.navigate(['/roles', rol.id]);
  }

  async onEliminar(rol: Rol): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Eliminar el rol "${rol.nombre}"? Esta acción no se puede deshacer.`,
      header: 'Eliminar rol',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.rolService.eliminar(rol.id).subscribe({
      next: () => {
        this.toast.success('Rol eliminado.');
        this.cargar(this.ultimoEvento);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(error.status === 422 ? error.error?.message : 'No se pudo eliminar el rol.');
      },
    });
  }
}
