import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { DynamicFormField } from './dynamic-form.types';

/**
 * Constructor de formularios con validacion consistente: dado un arreglo
 * de DynamicFormField, arma un FormGroup (Reactive Forms) y renderiza el
 * control de PrimeNG correspondiente a cada `type`. El mensaje de error
 * (errorFor) sigue siempre el mismo patron sin importar el tipo de campo
 * -- ningun modulo futuro necesita reinventar su propio bloque de
 * validacion.
 */
@Component({
  selector: 'nucleo-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Button, Checkbox, DatePicker, InputText, Select, Textarea],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFormComponent implements OnChanges {
  @Input({ required: true }) fields: DynamicFormField[] = [];
  @Input() submitLabel = 'Guardar';
  /**
   * Modo "visualizar": todo el formulario queda deshabilitado (ningun
   * control editable) y el boton de submit no se renderiza -- para cuando
   * el usuario puede VER una entidad pero no tiene permiso de editarla.
   * Es el mismo formulario que en modo edicion, nunca una plantilla
   * aparte (ver el reporte). Independiente de `field.readonly`, que
   * deshabilita solo un campo puntual (ej. codigo de barras autogenerado).
   */
  @Input() readonly = false;

  @Output() formSubmit = new EventEmitter<Record<string, unknown>>();

  private readonly fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({});

  ngOnChanges(): void {
    this.buildForm();
  }

  /**
   * Campo condicional (dependsOn): visible solo cuando el control del que
   * depende tiene uno de los valores esperados. Se llama tambien desde el
   * template (`@if (esVisible(field))`), asi que debe ser barato.
   */
  esVisible(field: DynamicFormField): boolean {
    if (!field.dependsOn) {
      return true;
    }

    const valorActual = this.form.get(field.dependsOn.field)?.value;

    return field.dependsOn.values.includes(valorActual);
  }

  private buildForm(): void {
    const controls: Record<string, unknown> = {};

    for (const field of this.fields) {
      const validators = [...(field.validators ?? [])];
      if (field.required) {
        // No Validators.required liso: si el campo esta oculto (otro tipo
        // de regla, por ejemplo) no debe bloquear el submit solo porque
        // esta vacio -- ver dependsOn en dynamic-form.types.ts.
        validators.push(this.requeridoSiVisible(field));
      }
      if (field.maxLength !== undefined) {
        validators.push(Validators.maxLength(field.maxLength));
      }
      controls[field.name] = [
        { value: field.defaultValue ?? null, disabled: this.readonly || field.readonly === true },
        validators,
      ];
    }

    this.form = this.fb.group(controls);
    this.revalidarDependientesAlCambiar();
  }

  private requeridoSiVisible(field: DynamicFormField): ValidatorFn {
    return (control) => (this.esVisible(field) ? Validators.required(control) : null);
  }

  /**
   * Cambiar el campo del que depende uno condicional no revalida el
   * dependiente por si solo (Angular solo re-evalua un control cuando SU
   * PROPIO valor cambia) -- se fuerza aqui para que required-si-visible
   * reaccione de inmediato al cambiar, por ejemplo, `tipo`.
   */
  private revalidarDependientesAlCambiar(): void {
    const dependientes = this.fields.filter((f) => f.dependsOn);
    const disparadores = new Set(dependientes.map((f) => f.dependsOn!.field));

    for (const disparador of disparadores) {
      this.form.get(disparador)?.valueChanges.subscribe(() => {
        for (const dependiente of dependientes.filter((f) => f.dependsOn!.field === disparador)) {
          this.form.get(dependiente.name)?.updateValueAndValidity({ emitEvent: false });
        }
      });
    }
  }

  errorFor(field: DynamicFormField): string | null {
    const control = this.form.get(field.name);
    if (!control || !control.touched || control.valid) {
      return null;
    }
    if (control.hasError('server')) {
      return control.getError('server');
    }
    if (control.hasError('required')) {
      return `${field.label} es obligatorio.`;
    }
    if (control.hasError('email')) {
      return 'Correo invalido.';
    }
    if (control.hasError('minlength')) {
      return `Debe tener al menos ${control.getError('minlength').requiredLength} caracteres.`;
    }
    if (control.hasError('maxlength')) {
      return `No puede tener más de ${control.getError('maxlength').requiredLength} caracteres.`;
    }
    if (control.hasError('min') && control.hasError('max')) {
      // No deberia ocurrir a la vez (un valor no puede ser < min y > max),
      // pero por si acaso se cubre con el mismo mensaje de rango.
      return `Debe estar entre ${control.getError('min').min} y ${control.getError('max').max}.`;
    }
    if (control.hasError('min')) {
      return `Debe ser mayor o igual a ${control.getError('min').min}.`;
    }
    if (control.hasError('max')) {
      return `Debe ser menor o igual a ${control.getError('max').max}.`;
    }
    return 'Valor invalido.';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      // getRawValue() (no .value): un campo deshabilitado -- por
      // `readonly` global o `field.readonly` puntual -- NO aparece en
      // .value, pero su valor (ej. un codigo_barras autogenerado que el
      // usuario no toco) sigue siendo parte del registro.
      this.formSubmit.emit(this.form.getRawValue());
    }
  }

  /**
   * Vuelca errores de validacion del backend (422) sobre los controles
   * correspondientes -- para que se muestren con el mismo `errorFor()` que
   * cualquier error de validacion local, sin que el consumidor tenga que
   * armar su propio bloque de errores de servidor por separado.
   */
  setServerErrors(errors: Record<string, string | string[]>): void {
    for (const [name, message] of Object.entries(errors)) {
      const control = this.form.get(name);
      if (control) {
        control.setErrors({ server: Array.isArray(message) ? message[0] : message });
        control.markAsTouched();
      }
    }
  }
}
