<?php

namespace App\Modules\Nucleo\Services;

use App\Modules\Nucleo\Exceptions\LicenciaActivacionFallidaException;
use App\Modules\Nucleo\Models\InstalacionNucleo;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Unico punto de contacto con el servidor central de licencias (proyecto
 * aparte, repo Servidor_Licencias). Contrato verificado directamente contra
 * su codigo real -- LicenciaValidacionController::validar() +
 * LicenciaValidacionService::respuesta() -- no contra memoria de "como
 * deberia ser":
 *
 * Request (POST {servidor_url}/api/validar-licencia): producto_slug
 * (string), tenant_id_producto (int), identificador_instancia (string),
 * token_actual (string, nullable -- OJO: no "token_firmado", ese es el
 * nombre de la columna LOCAL en licencia_local, distinto del campo que
 * viaja por HTTP).
 *
 * Response 200: {producto_slug, tenant_id_producto, tipo, estado, token,
 * fecha_expiracion}. `token` (no "token_firmado") es siempre null para
 * tipo=saas (ese tipo se valida por consulta directa a BD, nunca firma
 * JWT) y un JWT para pago_unico/anual/demo. No incluye `plan_id` -- el
 * servidor central no lo expone en esta respuesta.
 *
 * Response 404: producto_slug+tenant_id_producto no tiene ninguna licencia
 * registrada -- DISTINTO de "revocada" (esa se responde 200 con estado
 * explicito). 404 nunca es "temporalmente inalcanzable", es "esta
 * instalacion nunca fue activada aqui".
 *
 * Response 422: instalacion_unica del plan violada (otra instancia ya
 * activa) -- errors.identificador_instancia.
 *
 * Dos entradas a esta clase, con manejo de fallo deliberadamente distinto:
 *
 * - activar(): primera activacion de un tenant (o reactivacion manual). No
 *   hay un estado previo del cual caer hacia atras, asi que cualquier fallo
 *   (red o rechazo explicito del servidor) es un error duro -- ver
 *   LicenciaActivacionFallidaException.
 * - revalidar(): para un tenant que YA tiene licencia_local. Si el servidor
 *   no responde (red caida/timeout), NO marca la licencia como invalida de
 *   inmediato -- aplica el periodo de gracia configurable
 *   (licencias.periodo_gracia_dias) contado desde ultima_validacion. Si el
 *   servidor SI responde (aunque sea con estado=revocada/vencida), eso se
 *   refleja de inmediato, sin gracia -- la gracia es solo para "no sabemos
 *   que esta pasando", nunca para contradecir una respuesta real del
 *   servidor.
 */
class LicenciaClienteService
{
    private const ESTADOS_VALIDOS = ['activa', 'vencida', 'revocada', 'prueba'];

    public function activar(Tenant $tenant): LicenciaLocal
    {
        $licenciaLocal = LicenciaLocal::query()->where('tenant_id', $tenant->id)->first();

        $respuesta = $this->llamarServidor($tenant, $licenciaLocal);

        if ($respuesta === null) {
            throw new LicenciaActivacionFallidaException(
                'No se pudo contactar al servidor de licencias. Verifica LICENCIAS_SERVIDOR_URL y la conexion de red.',
            );
        }

        if ($respuesta->status() === 404) {
            throw new LicenciaActivacionFallidaException(
                'El servidor de licencias no tiene ninguna licencia registrada para este producto_slug + tenant_id_producto.',
            );
        }

        $datos = $this->parsearRespuesta($respuesta);

        if ($datos === null) {
            throw new LicenciaActivacionFallidaException(
                'El servidor de licencias respondio, pero con un cuerpo invalido o un estado no reconocido.',
            );
        }

        if ($licenciaLocal === null) {
            $licenciaLocal = new LicenciaLocal(['tenant_id' => $tenant->id]);
        }

        $this->aplicarDatos($licenciaLocal, $datos);

        return $licenciaLocal;
    }

    /**
     * @param  LicenciaLocal  $licenciaLocal  Debe existir ya -- ver el
     *                                        docblock de la clase.
     */
    public function revalidar(LicenciaLocal $licenciaLocal): LicenciaLocal
    {
        $tenant = $licenciaLocal->tenant ?? Tenant::query()->find($licenciaLocal->tenant_id);

        $respuesta = $tenant !== null ? $this->llamarServidor($tenant, $licenciaLocal) : null;
        $datos = $respuesta !== null ? $this->parsearRespuesta($respuesta) : null;

        if ($datos !== null) {
            $this->aplicarDatos($licenciaLocal, $datos);

            return $licenciaLocal;
        }

        $this->aplicarPeriodoDeGracia($licenciaLocal);

        return $licenciaLocal;
    }

    private function llamarServidor(Tenant $tenant, ?LicenciaLocal $licenciaLocal): ?Response
    {
        $servidorUrl = config('licencias.servidor_url');

        if (empty($servidorUrl)) {
            Log::warning('LicenciaClienteService: LICENCIAS_SERVIDOR_URL no esta configurado.');

            return null;
        }

        $payload = [
            'producto_slug' => config('licencias.producto_slug'),
            'tenant_id_producto' => $tenant->id,
            'identificador_instancia' => InstalacionNucleo::identificador(),
            // El servidor espera "token_actual" -- ver el docblock de la
            // clase. licencia_local.token_firmado es solo el nombre de la
            // columna local.
            'token_actual' => $licenciaLocal?->token_firmado,
        ];

        try {
            return Http::timeout((int) config('licencias.timeout_segundos', 10))
                ->post(rtrim($servidorUrl, '/').'/api/validar-licencia', $payload);
        } catch (ConnectionException $e) {
            Log::warning('LicenciaClienteService: no se pudo contactar al servidor de licencias.', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Solo se considera una respuesta "autoritativa" (nunca gracia, aplica
     * de inmediato) cuando el servidor devolvio 200 con un `estado`
     * reconocido. Cualquier otra cosa -- 404 (no registrada), 422
     * (instalacion_unica violada), 429 (rate limit), 5xx, cuerpo sin
     * `estado`, o un valor de `estado` fuera del enum de licencia_local --
     * se trata igual que "no hubo contacto exitoso", nunca como un rechazo
     * implicito. El 404 SI se distingue aparte en activar() (ver arriba)
     * para dar un mensaje mas claro que "no se pudo contactar".
     *
     * @return array{estado: string, tipo: ?string, token: ?string, fecha_expiracion: ?string}|null
     */
    private function parsearRespuesta(Response $respuesta): ?array
    {
        if ($respuesta->failed()) {
            return null;
        }

        $cuerpo = $respuesta->json();
        $estado = $cuerpo['estado'] ?? null;

        if (! is_string($estado) || ! in_array($estado, self::ESTADOS_VALIDOS, true)) {
            return null;
        }

        return [
            'estado' => $estado,
            'tipo' => $cuerpo['tipo'] ?? null,
            // Nombre del campo en la respuesta del servidor: "token", no
            // "token_firmado" -- ver el docblock de la clase.
            'token' => $cuerpo['token'] ?? null,
            'fecha_expiracion' => $cuerpo['fecha_expiracion'] ?? null,
        ];
    }

    /**
     * @param  array{estado: string, tipo: ?string, token: ?string, fecha_expiracion: ?string}  $datos
     */
    private function aplicarDatos(LicenciaLocal $licenciaLocal, array $datos): void
    {
        $licenciaLocal->estado = $datos['estado'];
        $licenciaLocal->ultima_validacion = now();

        // token viene null siempre para tipo=saas (se valida por consulta
        // directa, el servidor central nunca firma JWT para ese tipo) --
        // no se sobreescribe token_firmado local con null en ese caso.
        if ($datos['token'] !== null) {
            $licenciaLocal->token_firmado = $datos['token'];
        }

        if ($datos['tipo'] !== null) {
            $licenciaLocal->tipo = $datos['tipo'];
        }

        if ($datos['fecha_expiracion'] !== null) {
            $licenciaLocal->fecha_expiracion = $datos['fecha_expiracion'];
        }

        if ($licenciaLocal->fecha_inicio === null) {
            $licenciaLocal->fecha_inicio = now()->toDateString();
        }

        $licenciaLocal->save();
    }

    /**
     * NUNCA toca ultima_validacion (es, por definicion, la fecha del ultimo
     * contacto EXITOSO -- tocarla aqui invalidaria la cuenta del periodo de
     * gracia) ni token_firmado (se conserva el ultimo token conocido). Solo
     * decide si el `estado` sigue siendo el que ya tenia (dentro de la
     * gracia) o pasa a 'vencida' (gracia agotada).
     */
    private function aplicarPeriodoDeGracia(LicenciaLocal $licenciaLocal): void
    {
        if ($licenciaLocal->ultima_validacion === null) {
            // Nunca hubo un contacto exitoso -- no hay "ultimo estado
            // conocido" del cual sostenerse. No se agrega logica especial
            // aqui: si esto ocurre es porque el registro se creo por fuera
            // de activar() (fuera de flujo normal), lo dejamos como esta.
            return;
        }

        $diasSinContacto = (int) $licenciaLocal->ultima_validacion->diffInDays(now());
        $periodoGraciaDias = (int) config('licencias.periodo_gracia_dias', 7);

        if ($diasSinContacto > $periodoGraciaDias) {
            $licenciaLocal->estado = 'vencida';
            $licenciaLocal->save();
        }

        // Dentro del periodo de gracia: no se toca nada, el estado actual
        // (activa/prueba/etc.) se mantiene tal cual.
    }
}
