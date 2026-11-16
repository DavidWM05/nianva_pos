import { HttpContextToken } from '@angular/common/http';

/** Marca una peticion cuyos errores tecnicos maneja la pantalla. */
export const ERROR_EN_PANTALLA = new HttpContextToken<boolean>(() => false);
// Tambien calla el toast de negocio: la pantalla muestra todos los errores de esa peticion.
