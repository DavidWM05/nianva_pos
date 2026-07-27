import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nucleo/ui-shared';
import { MultiSelect } from 'primeng/multiselect';

import { GrupoPermisos } from '../permiso.types';
import { PermisoService } from '../permiso.service';
import { RolFormPayload } from '../rol.service';
import { Rol } from '../rol.types';

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * RolCrearComponent) y por la pestana General de la vista de registro.
 * El checklist de permisos vive FUERA de DynamicFormComponent (mismo
 * patron que ReglaPrecioFormComponent/UsuarioFormComponent) -- un
 * multiselect AGRUPADO por modulo (p-multiselect con [group]="true", ver
 * el reporte: no existia un componente de checklist de permisos en
 * ui-shared, y armar uno nuevo para un solo consumidor no valia la pena
 * cuando PrimeNG ya trae agrupacion nativa).
 */
@Component({
  selector: 'nucleo-rol-form',
  standalone: true,
  imports: [FormsModule, DynamicFormComponent, MultiSelect],
  templateUrl: './rol-form.component.html',
  styleUrl: './rol-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolFormComponent implements OnInit, OnChanges {
  private readonly permisoService = inject(PermisoService);

  @Input() valorInicial: Rol | null = null;
  @Input() submitLabel = 'Guardar';
  @Input() readonly = false;

  @Output() guardar = new EventEmitter<RolFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];
  protected readonly permisosIds = signal<number[]>([]);
  protected grupos: GrupoPermisos[] = [];

  ngOnInit(): void {
    this.permisoService.agrupadosPorModulo().subscribe((grupos) => (this.grupos = grupos));
  }

  ngOnChanges(): void {
    this.permisosIds.set(this.valorInicial?.permisos ?? []);

    this.fields = [
      {
        name: 'nombre',
        label: 'Nombre',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial?.nombre ?? '',
        maxLength: 80,
      },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        defaultValue: this.valorInicial?.descripcion ?? '',
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({ ...(value as unknown as RolFormPayload), permisos: this.permisosIds() });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
