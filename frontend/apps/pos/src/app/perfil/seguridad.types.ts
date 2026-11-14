import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';

/**
 * Espejo de la forma que devuelve DispositivosConfiablesController::index()
 * del backend (backend/app/Modules/Nucleo/Http/Controllers/DispositivosConfiablesController.php).
 */
export type DispositivoConfiable = RespuestaDe<'/dispositivos-confiables', 'get'>['data'][number];

/**
 * Payload de PasswordResetController::cambiar(). `code` solo es necesario
 * si la cuenta tiene 2FA confirmado -- ver dos-factor.reciente.
 */
export interface CambiarPasswordPayload extends CuerpoDe<'/password/change', 'post'> {
  code?: string;
}
