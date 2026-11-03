import { AbstractControl } from '@angular/forms';

export function quitarErrorServidor(control: AbstractControl | null | undefined): void {
  if (! control?.hasError('servidor')) {
    return;
  }

  const errores = { ...(control.errors ?? {}) };
  delete errores['servidor'];
  control.setErrors(Object.keys(errores).length > 0 ? errores : null);
}
