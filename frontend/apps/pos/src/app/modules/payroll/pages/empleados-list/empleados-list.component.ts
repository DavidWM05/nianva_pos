import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  EntidadSelectorComponent,
  StatusBadgeComponent,
  ToastService,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

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
  imports: [
    DatePipe,
    FormsModule,
    DataTableComponent,
    DataTableCellDirective,
    EntidadSelectorComponent,
    StatusBadgeComponent,
    Button,
    DatePicker,
    Dialog,
    InputText,
    Select,
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

  protected readonly columns: DataTableColumn[] = [
    { field: 'usuario', header: 'Usuario' },
    { field: 'salario_base', header: 'Salario base' },
    { field: 'tipo_salario', header: 'Tipo' },
    { field: 'fecha_ingreso', header: 'Ingreso' },
    { field: 'activo', header: 'Activo' },
    { field: 'acciones', header: '' },
  ];

  protected readonly empleados = signal<Empleado[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<EmpleadosPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  // -- Nuevo empleado --
  protected readonly mostrarFormulario = signal(false);
  protected readonly usuarioId = signal<number | null>(null);
  protected readonly salarioBase = signal<number | null>(null);
  protected readonly tipoSalario = signal<TipoSalario>('fijo');
  protected readonly fechaIngreso = signal<Date | null>(null);
  protected readonly numeroSeguridadSocial = signal('');
  protected readonly guardando = signal(false);

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
      this.toast.error('No se pudo determinar tu sucursal. Vuelve a iniciar sesión.');

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
        fecha_ingreso: fechaIngreso ? fechaIngreso.toISOString().slice(0, 10) : null,
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
          this.toast.error(cuerpo?.message ?? 'No se pudo registrar el empleado.');
        },
      });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.empleadoService.listar(evento).subscribe({
      next: (respuesta) => {
        this.empleados.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
