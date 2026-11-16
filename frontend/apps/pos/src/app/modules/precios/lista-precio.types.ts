import type {
  ListaPrecioResource,
  ListaPrecioItemResource,
  ListaPrecioClienteResource,
} from '@nianva/api-contrato';
/** Fila del listado de listas-precio. Ajusta los campos al Resource del backend. */
export type ListaPrecio = Pick<ListaPrecioResource, 'id' | 'nombre' | 'activo'>;
export type ListaPrecioRegistro = ListaPrecioResource;
export type ListaPrecioItem = ListaPrecioItemResource;
export type ListaPrecioCliente = ListaPrecioClienteResource;
