/** Espejo de UnidadMedidaResource del backend (backend/app/Modules/UnidadesMedida). */
export type TipoUnidadMedida = 'entero' | 'fraccionario';

export interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
  tipo: TipoUnidadMedida;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
