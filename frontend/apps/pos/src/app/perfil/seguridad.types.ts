/**
 * Espejo de la forma que devuelve DispositivosConfiablesController::index()
 * del backend (backend/app/Modules/Nucleo/Http/Controllers/DispositivosConfiablesController.php).
 */
export interface DispositivoConfiable {
  id: number;
  user_agent: string | null;
  ip_registro: string | null;
  fecha_creacion: string;
  fecha_expiracion: string;
  es_actual: boolean;
}

/**
 * Payload de PasswordResetController::cambiar(). `code` solo es necesario
 * si la cuenta tiene 2FA confirmado -- ver dos-factor.reciente.
 */
export interface CambiarPasswordPayload {
  password_actual: string;
  password: string;
  password_confirmation: string;
  code?: string;
}
