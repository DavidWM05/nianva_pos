<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RutasConPermisoTest extends TestCase
{
    /**
     * Rutas autenticadas que a proposito no llevan permiso, con su motivo.
     *
     * @var array<string, string>
     */
    private const EXENTAS = [
        'GET /api/v1/user' => 'El usuario autenticado consulta sus propios datos.',
        'GET /api/v1/two-factor/qr-code' => 'Autoservicio de configuracion de 2FA del propio usuario.',
        'POST /api/v1/two-factor/confirm' => 'Autoservicio de confirmacion de 2FA del propio usuario.',
        'POST /api/v1/password/change' => 'Autoservicio de cambio de contrasena del propio usuario.',
        'GET /api/v1/dispositivos-confiables' => 'Autoservicio: lista solo los dispositivos del usuario autenticado.',
        'DELETE /api/v1/dispositivos-confiables/{dispositivo}' => 'Autoservicio: revoca solo un dispositivo del usuario autenticado.',
        'DELETE /api/v1/dispositivos-confiables' => 'Autoservicio: revoca todos los dispositivos del usuario autenticado.',
        'GET /api/v1/licencia-local' => 'Lectura del estado de la licencia del tenant propio.',
        'GET /api/v1/configuracion/publica' => 'Configuracion publica del tenant, sin datos sensibles.',
        'POST /logout' => 'Cierre de la propia sesion del usuario autenticado; no requiere permiso.',
    ];

    public function test_las_rutas_autenticadas_exigen_un_permiso_o_estan_exentas(): void
    {
        $faltantes = [];
        $existentes = [];

        foreach (Route::getRoutes() as $route) {
            $middlewares = $route->gatherMiddleware();

            if (! in_array('auth:sanctum', $middlewares, true)) {
                continue;
            }

            $clave = $route->methods()[0].' /'.$route->uri();
            $existentes[] = $clave;

            if (isset(self::EXENTAS[$clave])) {
                continue;
            }

            $tienePermiso = collect($middlewares)->contains(
                fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'permiso:'),
            );

            if (! $tienePermiso) {
                $faltantes[] = $clave;
            }
        }

        $huerfanas = array_diff(array_keys(self::EXENTAS), $existentes);

        $this->assertSame([], $faltantes, "Rutas autenticadas sin permiso:\n".implode("\n", $faltantes));
        $this->assertSame([], array_values($huerfanas), 'Entradas de EXENTAS que ya no existen como ruta: '.implode(', ', $huerfanas));
    }
}
