import { InjectionToken } from '@angular/core';
import { BuscadorDeHijos, BuscadorEntidad, EntidadBuscable } from '@nucleo/ui-shared';

/**
 * Un token de inyeccion por tipo de entidad "buscable" (ver
 * EntidadSelectorComponent en ui-shared). Viven en app/core, no en
 * ui-shared ni en el modulo que implementa cada uno, porque son un
 * concepto de la app (que entidades de dominio existen) que tanto el
 * modulo consumidor (Precios, TPV) como el modulo que la expone
 * (Inventario, CRM) necesitan referenciar sin importarse entre si --
 * solo app.config.ts conecta ambos lados.
 */
export const BUSCADOR_PRODUCTO = new InjectionToken<BuscadorEntidad>('BUSCADOR_PRODUCTO');
export const BUSCADOR_VARIANTE_DE_PRODUCTO = new InjectionToken<BuscadorDeHijos<EntidadBuscable>>(
  'BUSCADOR_VARIANTE_DE_PRODUCTO',
);
export const BUSCADOR_CATEGORIA = new InjectionToken<BuscadorEntidad>('BUSCADOR_CATEGORIA');
/** Prerrequisito de TPV (buscador de cliente para la pantalla de venta). */
export const BUSCADOR_CLIENTE = new InjectionToken<BuscadorEntidad>('BUSCADOR_CLIENTE');
