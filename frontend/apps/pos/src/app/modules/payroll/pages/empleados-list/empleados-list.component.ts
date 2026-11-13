import {
  CampoComponent,
  InputDineroComponent,
  BtnEnviarComponent,
  SelectFiltroComponent,
} from '@nianva/ui-forms';

import { ModalComponent } from '@nianva/ui-overlays';
import { MatInput } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { PROVEEDORES_FECHA_ES_MX, fechaComoIso } from '@nianva/ui-report';
import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import {
  BotonCrearComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import { PageComponent } from '@nianva/ui-layout';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DataTableLazyEvent,
  EntidadSelectorComponent,
  ToastService,
} from '@nianva/ui-shared';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { BUSCADOR_USUARIO } from '../../../../core/buscadores-entidad.tokens';
import { EmpleadoService, EmpleadosPermisos } from '../../empleado.service';
import { Empleado, TipoSalario } from '../../empleado.types';

const PERMISOS_VACIOS: EmpleadosPermisos = { crear: false };

const TIPOS_SALARIO: { label: string; value: TipoSalario }[] = [
  { label: 'Fijo (mensual)', value: 'fijo' },
  { label: 'Por hora', value: 'por_hora' },
];

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number';
}

/**
 * El alta vive en un dialogo sobre la misma lista (PayrollController no
 * tiene empleadosUpdate(), solo crear tiene sentido aqui) -- "Ver" navega
 * a /empleados/:id para el resto.
 */
@Component({
  selector: 'nucleo-empleados-list',
  standalone: true,
  providers: PROVEEDORES_FECHA_ES_MX,
  imports: [
    TablaComponent,
    BotonCrearComponent,
    PageComponent,
    FormsModule,
    EntidadSelectorComponent,
    CampoComponent,
    InputDineroComponent,
    BtnEnviarComponent,
    SelectFiltroComponent,
    ModalComponent,
    MatInput,
    MatDatepickerModule,
  ],
  templateUrl: './empleados-list.component.html',
  styleUrl: './empleados-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadosListComponent {
  private readonly empleadoService = inject(EmpleadoService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly buscadorUsuario = inject(BUSCADOR_USUARIO);
  protected readonly tiposSalario = TIPOS_SALARIO;

  protected readonly columns: ColumnaListado<
    Empleado & { usuarioTexto: string; salarioTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'usuarioTexto', encabezado: 'Usuario' },
    { tipo: 'dinero', campo: 'salario_base', encabezado: 'Salario base' },
    { tipo: 'texto', campo: 'salarioTexto', encabezado: 'Tipo' },
    { tipo: 'fecha', campo: 'fecha_ingreso', encabezado: 'Ingreso' },
    { tipo: 'acciones', acciones: () => this.acciones() },
  ];

  protected readonly empleados = signal<Empleado[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<EmpleadosPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };

  // -- Nuevo empleado --
  protected readonly mostrarFormulario = signal(false);
  protected readonly usuarioId = signal<number | null>(null);
  protected readonly salarioBase = signal<number | null>(null);
  protected readonly tipoSalario = signal<TipoSalario>('fijo');
  protected readonly fechaIngreso = signal<Date | null>(null);
  protected readonly numeroSeguridadSocial = signal('');
  protected readonly guardando = signal(false);

  constructor() {
    this.cargar(this.ultimoEvento);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(empleado: Empleado): void {
    this.router.navigate(['/payroll/empleados', empleado.id]);
  }

  abrirFormulario(): void {
    this.usuarioId.set(null);
    this.salarioBase.set(null);
    this.tipoSalario.set('fijo');
    this.fechaIngreso.set(null);
    this.numeroSeguridadSocial.set('');
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    const usuarioId = this.usuarioId();
    if (usuarioId === null) return;

    const sucursalId = this.authState.usuario()?.sucursal_id;
    if (!esNumero(sucursalId)) {
      this.toast.error(
        'No se pudo determinar tu sucursal. Vuelve a iniciar sesión.',
      );

      return;
    }

    this.guardando.set(true);

    const fechaIngreso = this.fechaIngreso();

    this.empleadoService
      .crear({
        usuario_id: usuarioId,
        sucursal_id: sucursalId,
        salario_base: this.salarioBase() ?? 0,
        tipo_salario: this.tipoSalario(),
        fecha_ingreso: fechaComoIso(fechaIngreso),
        numero_seguridad_social: this.numeroSeguridadSocial().trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarFormulario.set(false);
          this.toast.success('Empleado registrado.');
          this.cargar(this.ultimoEvento);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(
            cuerpo?.message ?? 'No se pudo registrar el empleado.',
          );
        },
      });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.errorCarga.set(false);
    this.loading.set(true);

    this.empleadoService.listar(evento).subscribe({
      next: (respuesta) => {
        this.empleados.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.primeraCarga.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.primeraCarga.set(false);
        this.loading.set(false);
        this.errorCarga.set(true);
      },
    });
  }
  protected readonly primeraCarga = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly estado = computed(() =>
    this.loading() && this.primeraCarga()
      ? 'cargando'
      : this.errorCarga()
        ? 'error'
        : 'listo',
  );
  protected readonly filas = computed(() =>
    this.empleados().map((f) => ({
      ...f,
      usuarioTexto: f.usuario?.nombre ?? 'Usuario #' + f.usuario_id,
      salarioTexto: f.tipo_salario === 'por_hora' ? 'Por hora' : 'Fijo',
    })),
  );
  protected get meta(): MetaListado {
    return {
      total: this.total(),
      page: Math.floor(this.ultimoEvento.first / this.ultimoEvento.rows) + 1,
      rows: this.ultimoEvento.rows,
      filtros_aplicados: {},
      permisos: {},
    };
  }
  onCambio(evento: CambioListado): void {
    this.onLazyLoad({
      first: (evento.page - 1) * evento.rows,
      rows: evento.rows,
      sortField: evento.sortField,
      sortOrder:
        evento.sortOrder === 'asc'
          ? 1
          : evento.sortOrder === 'desc'
            ? -1
            : null,
      filters: {},
    });
  }
  reintentar(): void {
    this.cargar(this.ultimoEvento);
  }
  protected readonly filaInactiva = (fila: Empleado) => !fila.activo;

  protected acciones(): AccionFila[] {
    return [{ tipo: 'ver' }];
  }
  onAccion(fila: Empleado, accion: AccionEmitida): void {
    if (accion.tipo === 'ver') this.irADetalle(fila);
  }
}
