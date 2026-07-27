import { ValidatorFn } from '@angular/forms';

export type DynamicFormFieldType = 'text' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date';

export interface DynamicFormFieldOption {
  label: string;
  value: unknown;
}

export interface DynamicFormField {
  name: string;
  label: string;
  type: DynamicFormFieldType;
  required?: boolean;
  placeholder?: string;
  /** Solo para type: 'select'. */
  options?: DynamicFormFieldOption[];
  /** Validadores adicionales; 'required' se agrega solo via el flag `required`. */
  validators?: ValidatorFn[];
  defaultValue?: unknown;
  /**
   * Solo para 'text'/'password'/'textarea' -- debe igualar el limite de la
   * columna VARCHAR correspondiente en la migracion (nunca se pone en
   * columnas TEXT, que no tienen limite). Agrega Validators.maxLength() Y
   * el atributo HTML `maxlength` (evita que el usuario escriba de mas, no
   * solo que se lo avisemos despues).
   */
  maxLength?: number;
  /** Deshabilita solo este campo (independiente del `readonly` global del formulario) -- ej. codigo de barras autogenerado. */
  readonly?: boolean;
  /**
   * Campo condicional: solo se muestra (y solo se exige `required`/
   * `validators`) cuando el control `dependsOn.field` tiene uno de los
   * valores en `dependsOn.values`. Primer caso real: el formulario de
   * regla de precio (Precios), donde `tipo` decide si aplican
   * valor/cantidad_compra/cantidad_paga/precio_bundle -- reutilizable por
   * cualquier formulario futuro con el mismo patron.
   */
  dependsOn?: { field: string; values: unknown[] };
}
