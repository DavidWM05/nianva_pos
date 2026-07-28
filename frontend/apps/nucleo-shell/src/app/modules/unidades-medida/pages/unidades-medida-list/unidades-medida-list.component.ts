import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogService, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { UnidadMedidaFormPayload, UnidadMedidaService } from '../../unidad-medida.service';
import { TipoUnidadMedida, UnidadMedida } from '../../unidad-medida.types';

const TIPOS: { label: string; value: TipoUnidadMedida }[] = [
  { label: 'Entero (sin decimales)', value: 'entero' },
  { label: 'Fraccionario (acepta decimales)', value: 'fraccionario' },
];

interface EstadoErrorNegocio {
  message?: string;
  error_code?: string;
}

/**
 * Catalogo transversal (ver 04_ESPECIFICACION_FRONTEND_UX.md §9, tipo
 * "Catálogo", una sola ruta) -- a diferencia de Categoria/Departamento no
 * tiene vista dedicada de crear/editar/visualizar: el backend
 * (UnidadMedidaController) no tiene `GET /unidades-medida/{id}`, y
 * `index()` siempre trae la lista completa sin paginar (normalmente
 * <20 filas), asi que un modal de alta/edicion sobre la misma lista ya
 * cargada es mas fiel al contrato real que forzar 2 rutas nuevas contra un
 * endpoint que no existe.
 *
 * Ninguna ruta de este modulo exige permiso (ver el reporte) -- todos los
 * botones se muestran siempre, sin `meta.permisos` que gatee nada.
 */
@Component({
  selector: 'nucleo-unidades-medida-list',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent, Button, Dialog, InputText, Select],
  templateUrl: './unidades-medida-list.component.html',
  styleUrl: './unidades-medida-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnidadesMedidaListComponent implements OnInit {
  private readonly unidadMedidaService = inject(UnidadMedidaService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS;

  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly cargando = signal(true);

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
        this.toast.error(this.mensajeError(error, 'No se pudo guardar la unidad de medida.'));
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
        this.toast.error(this.mensajeError(error, 'No se pudo eliminar la unidad de medida.'));
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.unidadMedidaService.listar().subscribe({
      next: (unidades) => {
        this.unidades.set(unidades);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  /**
   * `unidad_en_uso` es el unico error_code de negocio de este modulo (ver
   * bootstrap/app.php) -- se distingue por codigo, no por texto, igual que
   * el resto de Nucleo; el resto de errores (validacion 422 nativa, etc.)
   * cae al fallback.
   */
  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const cuerpo = error.error as EstadoErrorNegocio | undefined;

    return cuerpo?.message ?? fallback;
  }
}
