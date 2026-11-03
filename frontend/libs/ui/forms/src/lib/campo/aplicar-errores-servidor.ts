import { FormGroup } from '@angular/forms';
import { erroresValidacion } from '@nianva/ui-shared';

export function aplicarErroresServidor(form: FormGroup, error: unknown): boolean {
  const errores = erroresValidacion(error);
  let marco = false;

  for (const [campo, mensajes] of Object.entries(errores)) {
    const control = form.get(campo);
    const mensaje = mensajes[0];

    if (! control || ! mensaje) {
      continue;
    }

    control.setErrors({ ...(control.errors ?? {}), servidor: mensaje });
    control.markAsTouched();
    marco = true;
  }

  return marco;
}
