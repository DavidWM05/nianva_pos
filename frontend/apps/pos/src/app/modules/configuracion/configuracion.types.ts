/** Espejo de ConfiguracionTenantResource del backend (backend/app/Modules/Configuracion). */
export type FrecuenciaBackup = 'diario' | 'semanal' | 'mensual';

export interface ConfiguracionTenant {
  moneda: string;
  mensaje_ticket: string | null;
  /** Solo texto (URL) por ahora -- sin subida de archivo, ver el reporte. */
  logo_url: string | null;
  mostrar_rfc: boolean;
  mostrar_telefono: boolean;
  mostrar_correo: boolean;
  backup_auto: boolean;
  backup_frecuencia: FrecuenciaBackup;
  backup_ultimo: string | null;
  /** Si esta activo, ProductoVarianteController genera el codigo de barras de una variante nueva -- ver VarianteFormComponent. */
  codigo_barras_automatico: boolean;
}

export type ConfiguracionTenantFormPayload = Omit<ConfiguracionTenant, 'backup_ultimo'>;

/**
 * Espejo de ConfiguracionSeguridadController::show()/update() -- dias de
 * "recordar este dispositivo" por tenant. Vive en el tab Empresa de esta
 * pantalla (antes en el perfil de Preferencias, ver el reporte): es
 * politica de toda la empresa, no algo personal del usuario.
 */
export interface ConfiguracionSeguridad {
  dias_dispositivo_normal: number;
  dias_dispositivo_admin: number;
}

/** Espejo de LicenciaLocalResource. */
export type LicenciaEstado = 'activa' | 'vencida' | 'revocada' | 'prueba';
export type LicenciaTipo = 'saas' | 'pago_unico' | 'anual' | 'demo';

export interface LicenciaLocal {
  estado: LicenciaEstado;
  tipo: LicenciaTipo;
  fecha_expiracion: string | null;
  ultima_validacion: string | null;
  dias_desde_ultima_validacion: number | null;
  /**
   * Heurística del backend (ver el docblock de LicenciaLocalResource): no
   * hay un campo propio de "último intento" -- se infiere comparando
   * ultima_validacion contra el intervalo de revalidación esperado.
   */
  en_periodo_gracia: boolean;
}
