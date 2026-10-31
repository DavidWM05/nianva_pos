import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';

import { Rol } from '../rol.types';
import { RolService } from '../rol.service';
import { SucursalService, SucursalSimple } from '../sucursal.service';
import { UsuarioFormPayload } from '../usuario-admin.service';
import { UsuarioAdmin } from '../usuario.types';

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * UsuarioCrearComponent) y por la pestana General de la vista de
 * registro. `password` es requerido solo al crear -- en edicion, dejarlo
 * en blanco NO cambia la contrasena actual (ver UsuarioController::update()).
 *
 * sucursal_id/roles viven FUERA de DynamicFormComponent (mismo patron que
 * ReglaPrecioFormComponent con su EntidadSelectorComponent): un select y
 * un multiselect no encajan en el modelo de "un tipo de campo por fila".
 */
@Component({
  selector: 'nucleo-usuario-form',
  standalone: true,
  imports: [FormsModule, DynamicFormComponent, Select, MultiSelect],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent implements OnInit, OnChanges {
  private readonly rolService = inject(RolService);
  private readonly sucursalService = inject(SucursalService);

  @Input() valorInicial: UsuarioAdmin | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<UsuarioFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  protected readonly sucursalId = signal<number | null>(null);
  protected readonly rolesIds = signal<number[]>([]);

  protected sucursales: SucursalSimple[] = [];
  protected roles: Rol[] = [];

  ngOnInit(): void {
    this.sucursalService.listar().subscribe((sucursales) => (this.sucursales = sucursales));
    this.rolService.listarTodos().subscribe((roles) => (this.roles = roles));
  }

  ngOnChanges(): void {
    this.sucursalId.set(this.valorInicial?.sucursal?.id ?? null);
    this.rolesIds.set(this.valorInicial?.roles.map((rol) => rol.id) ?? []);

    const esEdicion = this.valorInicial !== null;

    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.nombre ?? '',
        maxLength: 150,
      },
      {
        name: 'apellido',
        label: 'Apellido',
        type: 'text',
        defaultValue: this.valorInicial?.apellido ?? '',
        maxLength: 150,
      },
      {
        name: 'alias',
        label: 'Alias',
        type: 'text',
        defaultValue: this.valorInicial?.alias ?? '',
        maxLength: 50,
      },
      {
        name: 'correo',
        label: 'Correo',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.correo ?? '',
        maxLength: 150,
      },
      {
        name: 'password',
        label: esEdicion ? 'Nueva contraseña (dejar en blanco para no cambiarla)' : 'Contraseña',
        type: 'password',
        required: !esEdicion,
        defaultValue: '',
      },
      {
        name: 'telefono',
        label: 'Teléfono',
        type: 'text',
        defaultValue: this.valorInicial?.telefono ?? '',
        maxLength: 20,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({
      ...(value as unknown as UsuarioFormPayload),
      sucursal_id: this.sucursalId(),
      roles: this.rolesIds(),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
