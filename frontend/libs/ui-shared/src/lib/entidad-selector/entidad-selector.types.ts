import { Observable } from 'rxjs';

/**
 * Forma minima que EntidadSelectorComponent necesita para mostrar una
 * entidad en el autocomplete o en el select en cascada. Cada modulo que
 * expone una entidad "buscable" adapta su propio modelo de dominio a
 * esta forma (por ejemplo, ProductoVariante no tiene `nombre` -- el
 * adapter de Inventario arma la etiqueta "talla / color" antes de
 * devolverla).
 */
export interface EntidadBuscable {
  id: number;
  nombre: string;
  /**
   * Opcional -- solo lo llenan buscadores de entidades con noción de stock
   * (ver VariantesDeProductoBuscadorService). El resto (cliente, categoría,
   * proveedor) simplemente no lo trae; ui-shared no sabe qué significa,
   * solo lo deja pasar para que el consumidor (ej. LineasProductoComponent)
   * lo use si lo necesita.
   */
  stock_actual?: number;
}

/**
 * Igual que AuditLogSource (ver audit-log-viewer.types.ts): ui-shared no
 * sabe que hay atras de la busqueda -- EntidadSelectorComponent recibe
 * la implementacion por @Input desde el componente que lo usa, y cada
 * modulo "buscable" (Inventario para producto/variante/categoria, CRM
 * para cliente, etc.) implementa esta clase abstracta contra su propio
 * servicio y se registra con un token de inyeccion especifico por tipo
 * de entidad en app.config.ts. Asi ningun modulo consumidor (Precios,
 * TPV) importa el servicio concreto de otro modulo.
 */
export abstract class BuscadorEntidad<T extends EntidadBuscable = EntidadBuscable> {
  abstract buscar(texto: string): Observable<T[]>;
  abstract obtener(id: number): Observable<T>;
}

/**
 * Contrato adicional y opcional para el caso de cascada (ej. elegir un
 * producto y luego una de sus variantes). Separado de BuscadorEntidad
 * porque la mayoria de entidades buscables (categoria, cliente) no
 * tienen hijos -- solo se inyecta cuando EntidadSelectorComponent se usa
 * en modo cascada.
 */
export abstract class BuscadorDeHijos<H extends EntidadBuscable = EntidadBuscable> {
  abstract hijosDe(padreId: number): Observable<H[]>;
}
