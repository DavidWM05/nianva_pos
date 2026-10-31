/**
 * Espejo de UsuarioResource del backend
 * (backend/app/Modules/Nucleo/Http/Resources/UsuarioResource.php).
 */
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string | null;
  correo: string;
  tenant_id: number | null;
  sucursal_id: number | null;
  es_superadmin: boolean;
  roles: string[];
  requiere_dos_factor: boolean;
  dos_factor_confirmado: boolean;
}

export interface LoginResponse {
  two_factor_required: boolean;
  user?: Usuario;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_url: string;
}

export interface TwoFactorConfirmResponse {
  user: Usuario;
  recovery_codes: string[];
}
