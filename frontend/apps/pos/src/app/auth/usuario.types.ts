import type { RespuestaDe, UsuarioResource } from '@nianva/api-contrato';

/**
 * UsuarioResource del backend
 * (backend/app/Modules/Nucleo/Http/Resources/UsuarioResource.php), generado desde
 * docs/api/openapi.json (API-08).
 */
export type Usuario = UsuarioResource;

/*
 * /login es una ruta de sesion de routes/web.php, fuera de la especificacion: su respuesta
 * sigue escrita a mano.
 */
export interface LoginResponse {
  two_factor_required: boolean;
  user?: Usuario;
}

export type TwoFactorSetupResponse = RespuestaDe<'/two-factor/qr-code', 'get'>;

export type TwoFactorConfirmResponse = RespuestaDe<'/two-factor/confirm', 'post'>;
