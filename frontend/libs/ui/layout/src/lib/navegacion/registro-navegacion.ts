import { InjectionToken } from '@angular/core';

/**
 * Una pantalla en el registro de navegacion (UI-08). El menu, el
 * encabezado de la pagina y los botones que llevan a ella toman el nombre
 * de aqui, nunca de un texto suelto.
 */
export interface EntradaNavegacion {
  clave: string;
  /** Ruta sin barra inicial, como en el router: `inventario/categorias`. */
  ruta: string;
  /** Mayuscula solo al inicio y sin "Gestion de". */
  nombre: string;
  icono: string;
  /** Permiso del backend que la habilita (`modulo.accion`), si aplica. */
  permiso?: string;
  /** Feature de la licencia que la habilita, si aplica. */
  feature?: string;
}

/** La app provee su registro; las libs de `ui/*` lo leen. */
export const REGISTRO_NAVEGACION = new InjectionToken<readonly EntradaNavegacion[]>('REGISTRO_NAVEGACION', {
  factory: () => [],
});

export function buscarEntrada(
  registro: readonly EntradaNavegacion[],
  clave: string,
): EntradaNavegacion | undefined {
  return registro.find((entrada) => entrada.clave === clave);
}

/** Mayuscula solo al inicio y sin "Gestion de" (UI-08). Devuelve el motivo si no cumple. */
export function problemaDeNombre(nombre: string): string | null {
  if (/^gesti[oó]n de\b/i.test(nombre.trim())) {
    return 'empieza con "Gestión de"';
  }

  const [primera, ...resto] = nombre.trim().split(/\s+/);

  if (primera && primera[0] !== primera[0].toLocaleUpperCase('es')) {
    return 'no empieza con mayúscula';
  }

  // Una palabra con mayuscula inicial y el resto en minuscula; las siglas (CxC, CRM) se permiten.
  const conMayuscula = resto.filter((palabra) => /^\p{Lu}\p{Ll}+$/u.test(palabra));

  return conMayuscula.length > 0 ? `mayúscula a mitad del nombre: ${conMayuscula.join(', ')}` : null;
}
