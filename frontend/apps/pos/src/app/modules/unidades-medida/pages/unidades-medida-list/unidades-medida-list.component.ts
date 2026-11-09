import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BotonCrearComponent } from '@nianva/ui-actions';
import { EstadoPagina, PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ToastService } from '@nianva/ui-feedback';
import { CampoComponent, SelectFiltroComponent } from '@nianva/ui-forms';
import { BtnEnviarComponent } from '@nianva/ui-forms';
import { ColumnaListado, TablaComponent } from '@nianva/ui-data';
import { ConfirmDialogService, mensajeError } from '@nianva/ui-shared';
import { ModalComponent } from '@nianva/ui-overlays';

import { UnidadMedidaFormPayload, UnidadMedidaService } from '../../unidad-medida.service';
import { TipoUnidadMedida, UnidadMedida } from '../../unidad-medida.types';

const TIPOS: { label: string; value: TipoUnidadMedida }[] = [
  { label: 'Entero (sin decimales)', value: 'entero' },
  { label: 'Fraccionario (acepta decimales)', value: 'fraccionario' },
];

interface UnidadVista extends UnidadMedida {
  tipoEtiqueta: string;
}

/**
 * Catalogo transversal (ver 04_ESPECIFICACION_FRONTEND_UX.md §9, tipo
 * "Catalogo", una sola ruta): el backend no tiene GET /unidades-medida/{id}
 * y devuelve la lista completa; el alta/edicion se resuelve sobre la lista.
 * Ninguna ruta del modulo exige permiso.
 */
@Component({
  selector: 'nucleo-unidades-medida-list',
  standalone: true,
  imports: [
    BotonCrearComponent,
    BtnEnviarComponent,
    CampoComponent,
    FormsModule,
    MatButton,
    MatCheckboxModule,
    ModalComponent,
    PageComponent,
    PageHeaderComponent,

    SelectFiltroComponent,
    TablaComponent,

  ],
  templateUrl: './unidades-medida-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnidadesMedidaListComponent implements OnInit {
  private readonly unidadMedidaService = inject(UnidadMedidaService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS;
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly cargando = signal(true);
  protected readonly primeraCarga = signal(true);
  protected readonly error = signal(false);
  protected readonly estadoPagina = computed<EstadoPagina>(() =>
    this.primeraCarga() ? 'cargando' : this.error() ? 'error' : 'listo',
  );
  protected readonly metaListado = computed(() => ({
    total: this.filas().length,
    page: 1,
    rows: Math.max(1, this.filas().length),
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly esInactiva = (fila: UnidadVista): boolean => !fila.activo;
  protected readonly filas = computed<UnidadVista[]>(() =>
    this.unidades().map((unidad) => ({
      ...unidad,
      tipoEtiqueta: unidad.tipo === 'entero' ? 'Entero' : 'Fraccionario',
    })),
  );
  protected readonly columnas: ColumnaListado<UnidadVista>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', apoyo: 'abreviatura', ordenable: true },
    { tipo: 'texto', campo: 'tipoEtiqueta', encabezado: 'Tipo' },
    {
      tipo: 'acciones',
      acciones: () => [{ tipo: 'editar' }, { tipo: 'eliminar' }],
    },
  ];

  protected readonly mostrarFormulario = signal(false);
  protected readonly unidadEnEdicion = signal<UnidadMedida | null>(null);
  protected readonly nombre = signal('');
  protected readonly abreviatura = signal('');
  protected readonly tipo = signal<TipoUnidadMedida>('entero');
  protected readonly activo = signal(true);
  protected readonly guardando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  abrirNueva(): void {
    this.unidadEnEdicion.set(null);
    this.nombre.set('');
    this.abreviatura.set('');
    this.tipo.set('entero');
    this.activo.set(true);
    this.mostrarFormulario.set(true);
  }

  abrirEditar(unidad: UnidadMedida): void {
    this.unidadEnEdicion.set(unidad);
    this.nombre.set(unidad.nombre);
    this.abreviatura.set(unidad.abreviatura);
    this.tipo.set(unidad.tipo);
    this.activo.set(unidad.activo);
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    const nombre = this.nombre().trim();
    const abreviatura = this.abreviatura().trim();
    if (!nombre || !abreviatura) return;

    const payload: UnidadMedidaFormPayload = { nombre, abreviatura, tipo: this.tipo(), activo: this.activo() };
    const enEdicion = this.unidadEnEdicion();

    this.guardando.set(true);
    const operacion = enEdicion
      ? this.unidadMedidaService.actualizar(enEdicion.id, payload)
      : this.unidadMedidaService.crear(payload);

    operacion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarFormulario.set(false);
        this.toast.success(enEdicion ? 'Unidad de medida actualizada.' : 'Unidad de medida creada.');
        this.cargar();
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toast.error(mensajeError(error, 'No se pudo guardar la unidad de medida.'));
      },
    });
  }

  async eliminar(unidad: UnidadMedida): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Eliminar la unidad de medida "${unidad.nombre}"? Esta acción no se puede deshacer.`,
      header: 'Eliminar unidad de medida',
      severity: 'danger',
    });
    if (!confirmado) return;

    this.unidadMedidaService.eliminar(unidad.id).subscribe({
      next: () => {
        this.toast.success('Unidad de medida eliminada.');
        this.cargar();
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(mensajeError(error, 'No se pudo eliminar la unidad de medida.'));
      },
    });
  }

  protected onAccionVista(fila: UnidadVista, accion: { tipo: string }): void {
    if (accion.tipo === 'editar') this.abrirEditar(fila);
    if (accion.tipo === 'eliminar') void this.eliminar(fila);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.unidadMedidaService.listar().subscribe({
      next: (unidades) => {
        this.unidades.set(unidades);
        this.cargando.set(false);
        this.primeraCarga.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
        this.primeraCarga.set(false);
      },
    });
  }
}
