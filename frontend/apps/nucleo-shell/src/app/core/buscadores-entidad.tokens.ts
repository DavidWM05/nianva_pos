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
/**
 * No hay un rol "repartidor" formal sembrado (solo admin/vendedor) --
 * repartidor_id en Pedidos solo referencia cualquier fila de `usuarios`.
 * Prerrequisito de Delivery (asignar repartidor a un pedido).
 */
export const BUSCADOR_USUARIO = new InjectionToken<BuscadorEntidad>('BUSCADOR_USUARIO');
/**
 * UnidadMedidaController::index() no pagina ni busca por texto (catalogo
 * chico, <20 filas tipico) -- el adapter filtra client-side sobre la
 * lista completa ya cargada. Prerrequisito de Producción (unidad_medida_id
 * en Insumos/RecetaIngrediente).
 */
export const BUSCADOR_UNIDAD_MEDIDA = new InjectionToken<BuscadorEntidad>('BUSCADOR_UNIDAD_MEDIDA');
/** Prerrequisito de Producción (elegir insumos al armar los ingredientes de una receta). */
export const BUSCADOR_INSUMO = new InjectionToken<BuscadorEntidad>('BUSCADOR_INSUMO');
/**
 * RecetaController::recetasIndex() pagina pero no busca por texto (solo
 * filtra por `variante_id`) -- el adapter filtra client-side sobre una
 * pagina grande, mismo compromiso que InsumoBuscadorService. Prerrequisito
 * de Producción (elegir receta al crear una orden de producción).
 */
export const BUSCADOR_RECETA = new InjectionToken<BuscadorEntidad>('BUSCADOR_RECETA');
/**
 * Venta no tiene `nombre` propio -- el adapter arma una etiqueta
 * "Venta #id - cliente - $total". Prerrequisito de Ventas a Plazos (elegir
 * la venta sobre la que se arma un plan de pago).
 */
export const BUSCADOR_VENTA = new InjectionToken<BuscadorEntidad>('BUSCADOR_VENTA');
