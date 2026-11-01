<?php

namespace Tests\Feature\Permisos;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Contracts\Routing\UrlRoutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
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

    /**
     * Rutas con binding que no se pueden preparar genericamente. Se mantiene
     * vacia: cualquier entrada debe tener una razon concreta.
     *
     * @var array<string, string>
     */
    private const RUTAS_BINDING_SIN_CUBRIR = [];

    #[DataProvider('roles')]
    public function test_la_matriz_cubre_las_rutas_con_route_model_binding(string $rol): void
    {
        $usuario = $this->usuarioConRol($rol);
        $fallos = [];

        foreach ($this->rutasConBinding() as [$metodo, $uri, $permiso]) {
            if ($permiso === null) {
                $fallos[] = "{$rol} {$metodo} {$uri}: ruta con binding sin permiso.";

                continue;
            }

            $respuesta = $this->actingAs($usuario)->json($metodo, $uri);
            $espera403 = ! $usuario->tienePermiso($permiso);

            if ($espera403 && $respuesta->getStatusCode() !== 403) {
                $fallos[] = "{$rol} {$metodo} {$uri}: se esperaba 403 por falta de {$permiso}, llego {$respuesta->getStatusCode()}.";
            }

            if (! $espera403 && $respuesta->getStatusCode() === 403) {
                $fallos[] = "{$rol} {$metodo} {$uri}: tiene {$permiso} pero recibio 403.";
            }
        }

        $this->assertSame([], $fallos, implode("\n", $fallos));
    }

    /**
     * @return list<array{string, string, ?string}>
     */
    private function rutasConBinding(): array
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

            $bindings = collect($route->signatureParameters(UrlRoutable::class))
                ->mapWithKeys(fn ($parametro) => [$parametro->getName() => $parametro->getType()?->getName()]);

            if ($bindings->isEmpty()) {
                continue;
            }

            if (isset(self::RUTAS_BINDING_SIN_CUBRIR[$route->uri()])) {
                continue;
            }

            $uri = '/'.$route->uri();

            foreach ($route->parameterNames() as $nombre) {
                if ($bindings->has($nombre)) {
                    $modelo = $this->crearModeloParaBinding($bindings->get($nombre));
                    $uri = str_replace('{'.$nombre.'}', (string) $modelo->getRouteKey(), $uri);

                    continue;
                }

                $uri = str_replace('{'.$nombre.'}', '999999', $uri);
            }

            $rutas[] = [$route->methods()[0], $uri, $permiso !== null ? substr($permiso, strlen('permiso:')) : null];
        }

        return $rutas;
    }

    private function crearModeloParaBinding(string $clase): UrlRoutable
    {
        if ($clase === CajaSesion::class) {
            return CajaSesion::factory()->create([
                'sucursal_id' => $this->sucursal->id,
                'usuario_id' => $this->usuario->id,
            ]);
        }

        if ($clase === ProductoVariante::class) {
            $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);

            return ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        }

        // La matriz prueba permisos, no aislamiento (eso es AislamientoBindingTest):
        // los recursos operativos se crean en la sucursal del usuario del test,
        // para que el scope por sucursal (SEG-01) no convierta un 403 en 404.
        if ($clase === CuentaCobrar::class) {
            return CuentaCobrar::factory()->create([
                'venta_id' => Venta::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id])->id,
            ]);
        }

        if ($clase === CuentaPagar::class) {
            return CuentaPagar::factory()->create([
                'compra_id' => Compra::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id])->id,
            ]);
        }

        $atributos = ['tenant_id' => $this->tenant->id];

        if (Schema::hasColumn((new $clase)->getTable(), 'sucursal_id')) {
            $atributos['sucursal_id'] = $this->sucursal->id;
        }

        return $clase::factory()->create($atributos);
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
