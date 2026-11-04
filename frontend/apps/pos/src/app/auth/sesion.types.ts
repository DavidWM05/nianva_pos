import { Usuario } from './usuario.types';

/**
 * Espejo de SesionResource del backend (GET /api/v1/sesion, API-09). Escrito a mano hasta
 * que los tipos se generen desde docs/api/openapi.json (encargo 45b).
 */
export interface Sesion {
  usuario: Usuario;
  sucursal: { id: number; nombre: string } | null;
  /** Aun no existe en el backend: llega con el PIN de caja (Fase 4). */
  terminal: null;
  /** Nombres `modulo.accion`, ordenados. */
  permisos: string[];
  /** Slugs de los modulos encendidos (los mismos que aplica el middleware `modulo:`). */
  modulos_activos: string[];
  regional: { locale: string; moneda: string; zona_horaria: string };
  /** Aun no existe en el backend (Fase 7). */
  perfil_giro: null;
}
