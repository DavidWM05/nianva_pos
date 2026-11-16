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
  /**
   * Solo para 'number': valor minimo y maximo (atributos `min`/`max` y
   * Validators.min/max) y decimales que acepta (atributo `step` y error si
   * trae de mas).
   */
  min?: number;
  max?: number;
  decimales?: number;
  /**
   * Limites del campo tal como los da el contrato (`limitesDe()` de
   * @nianva/api-contrato, UI-11b): `requerido`, `maxLength`, `minimum`,
   * `maximum` y `decimales`. Cada uno aplica solo si el campo no declara el
   * suyo (`required`, `maxLength`, `min`, `max`, `decimales`).
   */
  limite?: DynamicFormLimite;
}

/** Forma de un limite del contrato; estructural para no depender de @nianva/api-contrato. */
export interface DynamicFormLimite {
  readonly requerido: boolean;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly decimales?: number;
}
