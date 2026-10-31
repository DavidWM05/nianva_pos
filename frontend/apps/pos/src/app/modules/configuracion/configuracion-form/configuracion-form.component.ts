import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import { ConfiguracionTenant, ConfiguracionTenantFormPayload, FrecuenciaBackup } from '../configuracion.types';

const OPCIONES_BACKUP_FRECUENCIA: { label: string; value: FrecuenciaBackup }[] = [
  { label: 'Diario', value: 'diario' },
  { label: 'Semanal', value: 'semanal' },
  { label: 'Mensual', value: 'mensual' },
];

/**
 * Un solo formulario, sin campos condicionales -- moneda/mensaje de
 * ticket/logo (solo URL de texto por ahora, ver el reporte)/que mostrar
 * en el ticket/backup. Igual que ConfiguracionSeguridadFormComponent:
 * valida en el cliente lo mismo que el backend (url basica, longitud de
 * moneda) para feedback inmediato, pero el backend sigue siendo quien
 * realmente lo exige.
 */
@Component({
  selector: 'nucleo-configuracion-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './configuracion-form.component.html',
  styleUrl: './configuracion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionFormComponent implements OnChanges {
  @Input({ required: true }) valorInicial!: ConfiguracionTenant;

  @Output() guardar = new EventEmitter<ConfiguracionTenantFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.fields = [
      {
        name: 'moneda',
        label: 'Moneda',
        type: 'text',
        required: true,
        defaultValue: this.valorInicial.moneda,
        maxLength: 5,
      },
      {
        name: 'mensaje_ticket',
        label: 'Mensaje del ticket',
        type: 'textarea',
        defaultValue: this.valorInicial.mensaje_ticket ?? '',
      },
      {
        name: 'logo_url',
        label: 'URL del logo',
        type: 'text',
        placeholder: 'https://...',
        defaultValue: this.valorInicial.logo_url ?? '',
        validators: [Validators.pattern(/^https?:\/\/.+/)],
        maxLength: 500,
      },
      {
        name: 'mostrar_rfc',
        label: 'Mostrar RFC en el ticket',
        type: 'checkbox',
        defaultValue: this.valorInicial.mostrar_rfc,
      },
      {
        name: 'mostrar_telefono',
        label: 'Mostrar teléfono en el ticket',
        type: 'checkbox',
        defaultValue: this.valorInicial.mostrar_telefono,
      },
      {
        name: 'mostrar_correo',
        label: 'Mostrar correo en el ticket',
        type: 'checkbox',
        defaultValue: this.valorInicial.mostrar_correo,
      },
      {
        name: 'backup_auto',
        label: 'Respaldo automático',
        type: 'checkbox',
        defaultValue: this.valorInicial.backup_auto,
      },
      {
        name: 'backup_frecuencia',
        label: 'Frecuencia de respaldo',
        type: 'select',
        required: true,
        options: OPCIONES_BACKUP_FRECUENCIA,
        defaultValue: this.valorInicial.backup_frecuencia,
      },
      {
        name: 'codigo_barras_automatico',
        label: 'Generar código de barras automáticamente al crear una variante',
        type: 'checkbox',
        defaultValue: this.valorInicial.codigo_barras_automatico,
      },
    ];
  }

  onSubmit(value: Record<string, unknown>): void {
    this.guardar.emit({
      moneda: String(value['moneda']),
      mensaje_ticket: (value['mensaje_ticket'] as string) || null,
      logo_url: (value['logo_url'] as string) || null,
      mostrar_rfc: Boolean(value['mostrar_rfc']),
      mostrar_telefono: Boolean(value['mostrar_telefono']),
      mostrar_correo: Boolean(value['mostrar_correo']),
      backup_auto: Boolean(value['backup_auto']),
      backup_frecuencia: value['backup_frecuencia'] as FrecuenciaBackup,
      codigo_barras_automatico: Boolean(value['codigo_barras_automatico']),
    });
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
