# @nianva/ui-forms

Inputs de formulario con `ControlValueAccessor`, `ui-campo` y los errores de
validación del servidor. Todos respetan el estado `disabled` del `FormControl`.

```html
<form [formGroup]="form" (ngSubmit)="guardar()">
  <ui-campo etiqueta="Precio" [requerido]="true" ayuda="Precio de venta antes de impuestos.">
    <ui-input-dinero formControlName="precio" [min]="0" [max]="99999" />
  </ui-campo>

  <ui-campo etiqueta="Cantidad" [requerido]="true">
    <ui-input-cantidad formControlName="cantidad" [decimales]="2" unidad="kg" />
  </ui-campo>

  <ui-form-actions>
    <button pButton type="button" label="Cancelar" severity="secondary"></button>
    <button pButton type="submit" label="Guardar"></button>
  </ui-form-actions>
</form>
```

```ts
import { FormControl, FormGroup } from '@angular/forms';
import { aplicarErroresServidor } from '@nianva/ui-forms';

readonly form = new FormGroup({
  precio: new FormControl<number | null>(null),
  cantidad: new FormControl<number | null>(null),
});

guardar(): void {
  this.form.markAllAsTouched();

  if (this.form.valid) {
    this.api.guardar(this.form.getRawValue()).subscribe({
      error: (error) => aplicarErroresServidor(this.form, error),
    });
  }
}
```

`ui-campo` muestra el `*` de requerido, la ayuda y el primer error del
control; agrega `aria-required`, `aria-invalid` y `aria-describedby` al
control. Un 422 con `errors.campo` se vuelca con `aplicarErroresServidor`, que
ignora los campos que no existen en el formulario y devuelve `true` si marcó
al menos uno. El error de servidor desaparece cuando el usuario edita el campo.

## Componentes

- `ui-input-dinero`: `inputmode="decimal"`, máximo 2 decimales, valor
  `number | null`, formato de `ui/format` al salir y número limpio al editar.
  Entradas `min`, `max` y `permitirNegativo` (falso por defecto).
- `ui-input-cantidad`: valor `number | null`, `decimales` de 0 a 3 (3 por
  defecto), `inputmode` numérico o decimal y `unidad` como sufijo.
- `ui-input-password`: botón de ojo con `aria-label` y `aria-pressed`;
  `autocomplete` por defecto `current-password`.
- `ui-input-pin`: PIN de 4 a 6 dígitos con teclado físico y táctil, sin
  `<input type="password">`, emite `(completo)` al llegar a la longitud y
  expone `limpiar()`. No valida PIN triviales ni los hashea.
- `ui-select-filtro`: `p-select` con placeholder vacío y la opción "Todas"
  equivalente a `null`.
