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

import { AuthStateService } from '../../../../auth/auth-state.service';
import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioAdmin, UsuariosPermisos } from '../../usuario.types';

const PERMISOS_VACIOS: UsuariosPermisos = { crear: false, editar: false, eliminar: false };

// UI-07: el backend rechaza desactivar al propio usuario (403 en UsuarioController); la accion se ve deshabilitada.
const MOTIVO_PROPIO_USUARIO = 'No puedes desactivar tu propio usuario';

interface FilaUsuario extends UsuarioAdmin {
  sucursalTexto: string;
  rolesTexto: string;
  estadoTexto: string;
}

/**
 * "Nuevo usuario"/"Editar" navegan a /usuarios/nuevo / /usuarios/:id
 * (vistas dedicadas, ver UsuarioCrearComponent/UsuarioDetalleComponent)
 * -- mismo criterio de Fase B/C, nunca un modal.
 */
@Component({
  selector: 'nucleo-usuarios-list',
  standalone: true,
  imports: [CampoComponent, FilterBarComponent, FormsModule, MatButton, PageComponent, PageHeaderComponent, RouterLink, TablaComponent],
  templateUrl: './usuarios-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosListComponent {
  private readonly usuarioService = inject(UsuarioAdminService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  // Quien tiene la sesion, ya cargado al arrancar (GET /sesion): no se pide otra vez.
  private readonly authState = inject(AuthStateService);

  protected readonly columnas: ColumnaListado<FilaUsuario>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
    { tipo: 'texto', campo: 'correo', encabezado: 'Correo', ordenable: true },
    { tipo: 'texto', campo: 'sucursalTexto', encabezado: 'Sucursal' },
    { tipo: 'texto', campo: 'rolesTexto', encabezado: 'Roles' },
    { tipo: 'texto', campo: 'estadoTexto', encabezado: 'Estado' },
    {
      tipo: 'acciones',
      acciones: (fila) => [
        ...(this.permisos().editar ? [{ tipo: 'editar' as const }] : []),
        ...(this.permisos().eliminar && fila.activo
          ? [
              fila.id === this.authState.usuario()?.id
                ? { tipo: 'estado' as const, activo: true, motivoDeshabilitada: MOTIVO_PROPIO_USUARIO }
                : { tipo: 'estado' as const, activo: true },
            ]
          : []),
      ],
    },
  ];

  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly permisos = signal<UsuariosPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();

  protected readonly filas = computed<FilaUsuario[]>(() =>
    this.usuarios().map((usuario) => ({
      ...usuario,
      sucursalTexto: usuario.sucursal?.nombre ?? '—',
      rolesTexto: this.etiquetaRoles(usuario),
      estadoTexto: usuario.activo ? 'Activo' : 'Inactivo',
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

  protected onAccion(usuario: FilaUsuario, accion: { tipo: string }): void {
    if (accion.tipo === 'editar') this.irADetalle(usuario);
    if (accion.tipo === 'estado') void this.onDesactivar(usuario);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.usuarioService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.usuarios.set(respuesta.data);
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
        this.cargar(this.ultimoEvento());
      },
      error: () => this.toast.error('No se pudo desactivar el usuario.'),
    });
  }
}
