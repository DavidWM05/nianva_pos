import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { ConfiguracionSeguridad } from '../configuracion.types';

const DIAS_MIN = 1;
const DIAS_MAX = 90;

/**
 * Dias de "recordar este dispositivo" (normal/admin) -- valida en el
 * cliente el mismo rango 1-90 que ConfiguracionSeguridadController valida
 * en el backend (between:1,90), para dar el error de inmediato, pero el
 * backend sigue siendo quien realmente lo hace cumplir (setServerErrors
 * cubre el caso de un cliente distinto a este frontend).
 */
@Component({
  selector: 'nucleo-configuracion-seguridad-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './configuracion-seguridad-form.component.html',
  styleUrl: './configuracion-seguridad-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionSeguridadFormComponent implements OnChanges {
  @Input({ required: true }) valorInicial!: ConfiguracionSeguridad;

  @Output() guardar = new EventEmitter<ConfiguracionSeguridad>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.fields = [
      {
        name: 'dias_dispositivo_normal',
        label: 'Días para recordar dispositivo (roles normales)',
        type: 'number',
        required: true,
        defaultValue: this.valorInicial.dias_dispositivo_normal,
        validators: [Validators.min(DIAS_MIN), Validators.max(DIAS_MAX)],
      },
      {
        name: 'dias_dispositivo_admin',
        label: 'Días para recordar dispositivo (admin/superadmin)',
        type: 'number',
        required: true,
        defaultValue: this.valorInicial.dias_dispositivo_admin,
        validators: [Validators.min(DIAS_MIN), Validators.max(DIAS_MAX)],
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({
      dias_dispositivo_normal: Number(value['dias_dispositivo_normal']),
      dias_dispositivo_admin: Number(value['dias_dispositivo_admin']),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
