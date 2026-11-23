import { DineroPipe, tasaANumero } from '@nianva/ui-format';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
  input,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CampoComponent, InputDineroComponent } from '@nianva/ui-forms';
import { SectionComponent } from '@nianva/ui-layout';
import { limitesDe } from '@nianva/api-contrato';
import { DynamicFormComponent, DynamicFormField } from '@nianva/ui-shared';

import {
  ConfiguracionTenant,
  ConfiguracionTenantFormPayload,
  FrecuenciaBackup,
} from '@nianva/domain-configuracion';

/** Límites del cuerpo de la petición, leídos del contrato (UI-11b). */
const LIMITES = limitesDe('/configuracion', 'put');

const OPCIONES_BACKUP_FRECUENCIA: { label: string; value: FrecuenciaBackup }[] =
  [
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
  imports: [CampoComponent, DineroPipe, DynamicFormComponent, InputDineroComponent, ReactiveFormsModule, SectionComponent],
  templateUrl: './configuracion-form.component.html',
  styleUrl: './configuracion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionFormComponent implements OnChanges {
  @Input({ required: true }) valorInicial!: ConfiguracionTenant;

  readonly enviando = input(false);

  protected readonly descuento = this.controlUmbral(LIMITES.margen_descuento_supervisor);
  protected readonly descuadre = this.controlUmbral(LIMITES.umbral_descuadre_supervisor);

  @Output() guardar = new EventEmitter<ConfiguracionTenantFormPayload>();

  @ViewChild(DynamicFormComponent) private formComponent!: DynamicFormComponent;

  protected fields: DynamicFormField[] = [];

  ngOnChanges(): void {
    this.descuento.reset(Number(this.valorInicial.margen_descuento_supervisor ?? 50));
    this.descuadre.reset(Number(this.valorInicial.umbral_descuadre_supervisor ?? 100));
    this.fields = [
      {
        name: 'cupon_combinable_con_promociones',
        label: 'Combinar cupones con promociones',
        type: 'checkbox',
        defaultValue:
          this.valorInicial.cupon_combinable_con_promociones ?? true,
      },
      {
        name: 'tasa_iva_default',
        label: 'Tasa de IVA por defecto',
        type: 'select',
        required: true,
        options: [
          { label: '16 %', value: '16.0000' },
          { label: '8 %', value: '8.0000' },
          { label: '0 %', value: '0.0000' },
        ],
        defaultValue: this.valorInicial.tasa_iva_default ?? '16.0000',
      },
      {
        name: 'moneda',
        label: 'Moneda',
        type: 'text',
        defaultValue: this.valorInicial.moneda,
        limite: LIMITES.moneda,
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
        limite: LIMITES.logo_url,
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
    const { descuento, descuadre } = this;
    if (descuento.invalid || descuadre.invalid || this.enviando()) {
      return;
    }

    this.guardar.emit({
      ...(descuento.dirty && descuento.value !== null ? { margen_descuento_supervisor: descuento.value } : {}),
      ...(descuadre.dirty && descuadre.value !== null ? { umbral_descuadre_supervisor: descuadre.value } : {}),
      cupon_combinable_con_promociones: Boolean(
        value['cupon_combinable_con_promociones'],
      ),
      tasa_iva_default: tasaANumero(String(value['tasa_iva_default'])),
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

  private controlUmbral(limites: { minimum: number; maximum: number; decimales: number }): FormControl<number | null> {
    return new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(limites.minimum),
      Validators.max(limites.maximum),
      Validators.pattern(new RegExp(`^[0-9]+(?:[.][0-9]{1,${limites.decimales}})?$`)),
    ]);
  }

  setServerErrors(errors: Record<string, string | string[]>): void {
    this.formComponent.setServerErrors(errors);
  }
}
