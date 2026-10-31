<?php

namespace Tests\Feature\Permisos;

use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Contracts\Routing\UrlRoutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class MatrizPermisosTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(NucleoRolesPermisosSeeder::class);
        $this->prepararNegocio([]);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function roles(): array
    {
        return [
            'admin' => ['admin'],
            'vendedor' => ['vendedor'],
        ];
    }

    #[DataProvider('roles')]
    public function test_la_matriz_de_permisos_responde_403_solo_cuando_falta_el_permiso(string $rol): void
    {
        $usuario = $this->usuarioConRol($rol);
        $fallos = [];

        foreach ($this->rutasConPermiso() as [$metodo, $uri, $permiso]) {
            $respuesta = $this->actingAs($usuario)->json($metodo, '/'.$uri);
            $espera403 = ! $usuario->tienePermiso($permiso);

            if ($espera403 && $respuesta->getStatusCode() !== 403) {
                $fallos[] = "{$rol} {$metodo} /{$uri}: se esperaba 403 por falta de {$permiso}, llego {$respuesta->getStatusCode()}.";
            }

            if (! $espera403 && $respuesta->getStatusCode() === 403) {
                $fallos[] = "{$rol} {$metodo} /{$uri}: tiene {$permiso} pero recibio 403.";
            }
        }

        $this->assertSame([], $fallos, implode("\n", $fallos));
    }

    private function usuarioConRol(string $rol): Usuario
    {
        $usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Usuario '.$rol,
            'correo' => uniqid($rol.'-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        $rolModelo = Rol::where('nombre', $rol)->firstOrFail();
        $usuario->roles()->attach($rolModelo->id);

        if ($rol === 'admin') {
            $usuario->forceFill(['two_factor_confirmed_at' => now()])->save();
        }

        return $usuario->refresh();
    }

    /**
     * @return list<array{string, string, string}>
     */
    private function rutasConPermiso(): array
    {
        $rutas = [];

        foreach (Route::getRoutes() as $route) {
            $middlewares = $route->gatherMiddleware();

            if (! in_array('auth:sanctum', $middlewares, true)) {
                continue;
            }

            $permiso = collect($middlewares)->first(
                fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'permiso:'),
            );

            if (! $permiso) {
                continue;
            }

            $parametros = $route->parameterNames();
            $uri = $route->uri();

            if ($parametros !== []) {
                // SubstituteBindings responde 404 antes de permiso:* para
                // parametros con route model binding (modelos UrlRoutable).
                $binding = collect($route->signatureParameters(UrlRoutable::class))
                    ->pluck('name')
                    ->intersect($parametros);

                if ($binding->isNotEmpty()) {
                    continue;
                }

                $uri = preg_replace('/\{[^}]+\}/', '999999', $uri);
            }

            $rutas[] = [$route->methods()[0], $uri, substr($permiso, strlen('permiso:'))];
        }

        return $rutas;
    }
}
