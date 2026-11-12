import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChecklistAgrupadoComponent, GrupoChecklist, IdOpcionChecklist } from '@nianva/ui-forms';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { GrupoPermisos } from '../permiso.types';
import { PermisoService } from '../permiso.service';
import { RolFormPayload } from '../rol.service';
import { Rol } from '../rol.types';

/** 'cuentas_cobrar' -> 'Cuentas cobrar'. */
function legible(texto: string): string {
  const conEspacios = texto.replace(/_/g, ' ');

  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
}

/**
 * Reutilizado por la vista de creacion (sin valorInicial, ver
 * RolCrearComponent) y por la pestana General de la vista de registro.
 * El checklist de permisos no es un campo de DynamicFormComponent: se
 * proyecta dentro de su <form>, antes del boton (50g), agrupado por
 * modulo (ui-checklist-agrupado). Su `readonly` lo aplica este
 * formulario, no DynamicFormComponent.
 */
@Component({
  selector: 'nucleo-rol-form',
  standalone: true,
  imports: [ChecklistAgrupadoComponent, DynamicFormComponent, FormsModule],
  templateUrl: './rol-form.component.html',
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
  protected readonly grupos = signal<GrupoPermisos[]>([]);
  /** Los permisos como grupos del checklist: un grupo por modulo. */
  protected readonly gruposChecklist = computed<GrupoChecklist[]>(() =>
    this.grupos().map((grupo) => ({
      id: grupo.modulo,
      etiqueta: legible(grupo.modulo),
      opciones: grupo.permisos.map((permiso) => ({ id: permiso.id, etiqueta: permiso.descripcion ?? legible(permiso.accion) })),
    })),
  );

  ngOnInit(): void {
    this.permisoService.agrupadosPorModulo().subscribe((grupos) => this.grupos.set(grupos));
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

  protected alCambiarPermisos(ids: readonly IdOpcionChecklist[]): void {
    this.permisosIds.set(ids.map(Number));
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({ ...(value as unknown as RolFormPayload), permisos: this.permisosIds() });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
