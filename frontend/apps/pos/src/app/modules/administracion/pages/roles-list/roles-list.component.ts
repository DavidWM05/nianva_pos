import { HttpErrorResponse } from '@angular/common/http';
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

import { RolService } from '../../rol.service';
import { Rol, RolesPermisos } from '../../rol.types';

const PERMISOS_VACIOS: RolesPermisos = { crear: false, editar: false, eliminar: false };

interface FilaRol extends Rol {
  descripcionTexto: string;
  usuarios: number;
  tipoTexto: string;
}

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
  imports: [CampoComponent, FilterBarComponent, FormsModule, MatButton, PageComponent, PageHeaderComponent, RouterLink, TablaComponent],
  templateUrl: './roles-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesListComponent {
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columnas: ColumnaListado<FilaRol>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
    { tipo: 'texto', campo: 'descripcionTexto', encabezado: 'Descripción' },
    { tipo: 'cantidad', campo: 'usuarios', encabezado: 'Usuarios' },
    { tipo: 'texto', campo: 'tipoTexto', encabezado: 'Tipo' },
    {
      tipo: 'acciones',
      acciones: (fila) => [
        ...(this.permisos().editar ? [{ tipo: 'editar' as const }] : []),
        ...(this.permisos().eliminar && !fila.es_sistema ? [{ tipo: 'eliminar' as const }] : []),
      ],
    },
  ];

  protected readonly roles = signal<Rol[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly primeraCarga = signal(true);
  protected readonly permisos = signal<RolesPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');
  private readonly ultimoEvento = signal<DataTableLazyEvent>({
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  });
  private readonly busquedaSubject = new Subject<string>();

  protected readonly filas = computed<FilaRol[]>(() =>
    this.roles().map((rol) => ({
      ...rol,
      descripcionTexto: rol.descripcion ?? '—',
      usuarios: rol.usuarios_count ?? 0,
      tipoTexto: rol.es_sistema ? 'Sistema' : 'Personalizado',
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

  protected onAccion(rol: FilaRol, accion: { tipo: string }): void {
    if (accion.tipo === 'editar') this.irADetalle(rol);
    if (accion.tipo === 'eliminar') void this.onEliminar(rol);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento.set(evento);
    this.loading.set(true);
    this.error.set(false);

    this.rolService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.roles.set(respuesta.data);
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
        this.cargar(this.ultimoEvento());
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(error.status === 422 ? error.error?.message : 'No se pudo eliminar el rol.');
      },
    });
  }
}
