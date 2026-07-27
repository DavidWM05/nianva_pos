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
} from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime } from 'rxjs';

import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioAdmin, UsuariosPermisos } from '../../usuario.types';

const PERMISOS_VACIOS: UsuariosPermisos = { crear: false, editar: false, eliminar: false };

/**
 * "Nuevo usuario"/"Editar" navegan a /usuarios/nuevo / /usuarios/:id
 * (vistas dedicadas, ver UsuarioCrearComponent/UsuarioDetalleComponent)
 * -- mismo criterio de Fase B/C, nunca un modal.
 */
@Component({
  selector: 'nucleo-usuarios-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosListComponent {
  private readonly usuarioService = inject(UsuarioAdminService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'correo', header: 'Correo', sortable: true },
    { field: 'sucursal', header: 'Sucursal' },
    { field: 'roles', header: 'Roles' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<UsuariosPermisos>(PERMISOS_VACIOS);
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

    this.usuarioService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.usuarios.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected etiquetaRoles(usuario: UsuarioAdmin): string {
    return usuario.roles.length === 0 ? '—' : usuario.roles.map((rol) => rol.nombre).join(', ');
  }

  irADetalle(usuario: UsuarioAdmin): void {
    this.router.navigate(['/usuarios', usuario.id]);
  }

  async onDesactivar(usuario: UsuarioAdmin): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar a "${usuario.nombre}"? Ya no podrá iniciar sesión.`,
      header: 'Desactivar usuario',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.usuarioService.desactivar(usuario.id).subscribe({
      next: () => {
        this.toast.success('Usuario desactivado.');
        this.cargar(this.ultimoEvento);
      },
      error: () => this.toast.error('No se pudo desactivar el usuario.'),
    });
  }
}
