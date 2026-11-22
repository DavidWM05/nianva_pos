<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Models\Concerns\RutaPorUlid;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Rutas;
use ReflectionMethod;
use ReflectionNamedType;
use Tests\TestCase;

/**
 * DAT-08: lo transaccional se identifica hacia fuera por su ulid. Toda ruta que resuelve un
 * modelo con TieneUlid lo busca por ulid (RutaPorUlid), ninguna ruta recibe `{id}` a mano salvo
 * los EXENTOS, y los Resources de esos modelos publican `id` como cadena en el contrato (`numero`
 * es el transitorio de D-3, entero, hasta el folio de DAT-07).
 */
class RutasConUlidTest extends TestCase
{
    /**
     * Rutas con `{id}` a mano permitidas, por prefijo de URI.
     *
     * @var array<string, string>
     */
    private const EXENTOS_ID = [
        'api/v1/pedidos/' => 'Delivery, congelado (ARQ-10, D-1): sus tablas no llevan ulid.',
        'api/v1/nominas/' => 'Payroll, congelado (ARQ-10, D-1): sus tablas no llevan ulid.',
        'api/v1/prestamos/' => 'Préstamos, congelado (ARQ-10, D-1): sus tablas no llevan ulid.',
        'api/v1/unidades-medida/' => 'Catálogo: unidades_medida no lleva ulid (D-2).',
    ];

    public function test_toda_ruta_que_resuelve_un_modelo_con_ulid_lo_busca_por_ulid(): void
    {
        $infracciones = [];
        $revisadas = 0;

        foreach ($this->rutasApi() as $ruta) {
            foreach ($this->modelosDeLaRuta($ruta) as $parametro => $clase) {
                if (! in_array(TieneUlid::class, class_uses_recursive($clase), true)) {
                    continue;
                }
                $revisadas++;
                $llave = (new $clase)->getRouteKeyName();
                if ($llave !== 'ulid' || ! in_array(RutaPorUlid::class, class_uses_recursive($clase), true)) {
                    $infracciones[] = "{$ruta->uri()} ({$parametro}: {$clase}) resuelve por '{$llave}'; el modelo debe usar RutaPorUlid.";
                }
            }
        }

        // Hoy son 35; si el conteo baja mucho, el test dejó de encontrar las rutas.
        $this->assertGreaterThanOrEqual(35, $revisadas, 'El test dejó de encontrar las rutas con binding de modelos con ulid.');
        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_ninguna_ruta_recibe_el_id_a_mano_fuera_de_los_exentos(): void
    {
        $infracciones = [];
        foreach ($this->rutasApi() as $ruta) {
            if (! in_array('id', $ruta->parameterNames(), true)) {
                continue;
            }
            $exenta = array_filter(array_keys(self::EXENTOS_ID), fn (string $prefijo) => str_starts_with($ruta->uri(), $prefijo));
            if ($exenta === []) {
                $infracciones[] = "{$ruta->uri()}: recibe {id} a mano; debe resolver el modelo por binding (DAT-08).";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_los_exentos_siguen_existiendo(): void
    {
        $uris = array_map(fn (Route $ruta) => $ruta->uri(), $this->rutasApi());
        foreach (array_keys(self::EXENTOS_ID) as $prefijo) {
            $this->assertNotEmpty(
                array_filter($uris, fn (string $uri) => str_starts_with($uri, $prefijo) && str_contains($uri, '{id}')),
                "EXENTOS_ID: {$prefijo} ya no tiene rutas con {id}; quítalo de la lista.",
            );
        }
    }

    public function test_los_resources_de_modelos_con_ulid_publican_el_id_como_cadena(): void
    {
        $esquemas = $this->contrato()['components']['schemas'];
        $infracciones = [];
        $revisados = [];

        foreach (glob(app_path('Modules/*/Http/Resources/*Resource.php')) ?: [] as $archivo) {
            $modelo = $this->modeloDelMixin((string) file_get_contents($archivo));
            if ($modelo === null || ! in_array(RutaPorUlid::class, class_uses_recursive($modelo), true)) {
                continue;
            }
            $esquema = basename($archivo, '.php');
            $revisados[] = $esquema;
            $propiedades = $esquemas[$esquema]['properties'] ?? null;
            if ($propiedades === null) {
                $infracciones[] = "{$esquema}: no está en el contrato (docs/api/openapi.json).";

                continue;
            }
            if (($propiedades['id']['type'] ?? null) !== 'string') {
                $infracciones[] = "{$esquema}.id publica ".json_encode($propiedades['id'] ?? null).'; debe ser el ulid (string).';
            }
            if (array_key_exists('numero', $propiedades)) {
                $infracciones[] = "{$esquema}.numero es un campo transitorio retirado en A5.";
            }
        }

        // 14 de los 15 modelos con RutaPorUlid tienen Resource (Compra no: su alta responde con
        // campos explícitos). Si el conteo baja, el test dejó de verlos.
        $this->assertGreaterThanOrEqual(14, count($revisados), 'Resources revisados: '.implode(', ', $revisados));
        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    /**
     * @return list<Route>
     */
    private function rutasApi(): array
    {
        return array_values(array_filter(
            Rutas::getRoutes()->getRoutes(),
            fn (Route $ruta) => str_starts_with($ruta->uri(), 'api/v1/'),
        ));
    }

    /**
     * Parámetros de la ruta que el controlador recibe como modelo (binding implícito).
     *
     * @return array<string, class-string<Model>>
     */
    private function modelosDeLaRuta(Route $ruta): array
    {
        $accion = $ruta->getActionName();
        if (! str_contains($accion, '@')) {
            return [];
        }
        [$controlador, $metodo] = explode('@', $accion);
        if (! method_exists($controlador, $metodo)) {
            return [];
        }
        $modelos = [];
        foreach ((new ReflectionMethod($controlador, $metodo))->getParameters() as $parametro) {
            $tipo = $parametro->getType();
            if (! $tipo instanceof ReflectionNamedType || $tipo->isBuiltin()) {
                continue;
            }
            $clase = $tipo->getName();
            if (in_array($parametro->getName(), $ruta->parameterNames(), true) && is_subclass_of($clase, Model::class)) {
                $modelos[$parametro->getName()] = $clase;
            }
        }

        return $modelos;
    }

    /** @return class-string<Model>|null */
    private function modeloDelMixin(string $codigo): ?string
    {
        if (preg_match('/@mixin\s+\\\\?([A-Za-z_\\\\]+)/', $codigo, $m) !== 1) {
            return null;
        }
        $nombre = $m[1];
        if (! str_contains($nombre, '\\') && preg_match('/^use\s+([A-Za-z_\\\\]+\\\\'.preg_quote($nombre, '/').');/m', $codigo, $u) === 1) {
            $nombre = $u[1];
        }

        return class_exists($nombre) && is_subclass_of($nombre, Model::class) ? $nombre : null;
    }

    /** @return array<string, mixed> */
    private function contrato(): array
    {
        return json_decode((string) file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
    }
}
