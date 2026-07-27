/** Espejo de CuponResource. */
export interface Cupon {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: string;
  uso_maximo: number | null;
  uso_maximo_por_cliente: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
}

export interface CuponesPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface CuponesPagina {
  data: Cupon[];
  total: number;
  permisos: CuponesPermisos;
}
