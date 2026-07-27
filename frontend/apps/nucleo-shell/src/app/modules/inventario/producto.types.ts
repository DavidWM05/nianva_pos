/** Espejo de CategoriaController::index()/DepartamentoController::index(). */
export interface CatalogoSimple {
  id: number;
  nombre: string;
}

/** Espejo de ProveedorController::index()/store(). */
export interface ProveedorSimple {
  id: number;
  razon_social: string;
}

/** Espejo de ProductoVarianteResource. */
export interface StockPorSucursal {
  sucursal_id: number;
  sucursal_nombre: string | null;
  stock_actual: number;
  stock_minimo: number;
}

export interface ProductoVariante {
  id: number;
  producto_id: number;
  talla: string | null;
  color: string | null;
  codigo_barras: string | null;
  activo: boolean;
  /** Solo presente cuando show() carga producto.variantes.stock. */
  stock?: StockPorSucursal[];
  /**
   * Solo presente en show() -- stock ya resuelto para la sucursal del
   * usuario actual (nunca null, 0 si no hay fila). Ver
   * VariantesDeProductoBuscadorService, que lo reexpone como
   * `stock_actual` en el EntidadBuscable que consume LineasProductoComponent.
   */
  stock_actual?: number;
}

/** Espejo de ProductoResource. */
export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: CatalogoSimple | null;
  departamento: CatalogoSimple | null;
  precio_compra: string;
  precio_venta: string;
  imagen_url: string | null;
  no_resurtible: boolean;
  sin_descuento: boolean;
  activo: boolean;
  /** Solo presente en la respuesta de index(). */
  stock_total?: number;
  /** Solo presente en la respuesta de show(). */
  variantes?: ProductoVariante[];
}

export interface ProductosPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  /** Solo presente en la respuesta de show() -- gate del boton "Registrar compra". */
  compras_crear?: boolean;
}

export interface ProductosPagina {
  data: Producto[];
  total: number;
  permisos: ProductosPermisos;
}

/** Espejo de KardexController::porVariante(). */
export interface MovimientoKardex {
  id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  motivo: 'venta' | 'compra' | 'devolucion' | 'merma' | 'ajuste' | 'apartado';
  sucursal_nombre: string | null;
  usuario_nombre: string | null;
  stock_resultante: number;
  fecha: string;
}
