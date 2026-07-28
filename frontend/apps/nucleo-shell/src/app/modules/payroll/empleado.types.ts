export type TipoSalario = 'fijo' | 'por_hora';

export interface EmpleadoUsuarioResumen {
  id: number;
  nombre: string;
}

export interface Empleado {
  id: number;
  usuario_id: number;
  usuario: EmpleadoUsuarioResumen | null;
  sucursal_id: number;
  salario_base: string;
  tipo_salario: TipoSalario;
  numero_seguridad_social: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
}

export interface EmpleadoCrearPayload {
  usuario_id: number;
  sucursal_id: number;
  salario_base?: number;
  tipo_salario?: TipoSalario;
  fecha_ingreso?: string | null;
  numero_seguridad_social?: string | null;
}
