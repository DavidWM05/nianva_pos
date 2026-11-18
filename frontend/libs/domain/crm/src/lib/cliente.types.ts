/**
 * Espejo de ClienteResource del backend
 * (backend/app/Modules/Crm/Http/Resources/ClienteResource.php).
 */
export interface Cliente {
  id: number;
  nombre: string;
  documento_fiscal: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  /** "Publico General" -- ver ClienteController::rechazarSiEsSistema(). No editable/desactivable. */
  es_sistema: boolean;
  fecha_registro: string;
}

export interface ClientesPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface ClientesPagina {
  data: Cliente[];
  total: number;
  permisos: ClientesPermisos;
}

/** Espejo de VentaController::porCliente() (backend/app/Modules/Tpv). */
export interface VentaResumen {
  id: number;
  fecha: string;
  total: string;
  estado: 'completada' | 'anulada';
  es_venta_sombra: boolean;
}
