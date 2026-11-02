<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class EspecificacionOpenApiTest extends TestCase
{
    /** @var array<string, string> */
    private const EXENTAS = [];

    public function test_el_archivo_existe_y_es_openapi_3(): void
    {
        $ruta = $this->rutaEspecificacion();

        $this->assertFileExists($ruta);

        $especificacion = json_decode(File::get($ruta), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($especificacion);
        $this->assertMatchesRegularExpression('/^3\.\d+\.\d+$/', $especificacion['openapi']);
        $this->assertSame('Nianva POS API', $especificacion['info']['title']);
        $this->assertSame('1', (string) $especificacion['info']['version']);
        $this->assertIsArray($especificacion['paths']);

        foreach ($especificacion['paths'] as $rutaApi => $operaciones) {
            $this->assertIsArray($operaciones, "{$rutaApi}: operaciones invalidas.");

            foreach ($operaciones as $metodo => $operacion) {
                if (! in_array($metodo, ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'], true)) {
                    continue;
                }

                $this->assertIsArray($operacion, "{$metodo} {$rutaApi}: operacion invalida.");
                $this->assertArrayHasKey('responses', $operacion, "{$metodo} {$rutaApi}: sin responses.");
            }
        }
    }

    public function test_la_ui_de_docs_no_es_publica_fuera_de_local(): void
    {
        $this->app['env'] = 'production';

        $this->get('/docs/api')->assertForbidden();
    }

    public function test_documenta_las_rutas_api_v1_con_permiso(): void
    {
        $rutas = [];

        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();

            if (! str_starts_with($uri, 'api/v1/') && $uri !== 'api/v1') {
                continue;
            }

            $ruta = '/'.ltrim(substr($uri, strlen('api/v1')), '/');

            if (isset(self::EXENTAS[$ruta])) {
                continue;
            }

            $tienePermiso = false;

            foreach ($route->gatherMiddleware() as $middleware) {
                if (is_string($middleware) && str_starts_with($middleware, 'permiso:')) {
                    $tienePermiso = true;
                    break;
                }
            }

            if ($tienePermiso) {
                $rutas[$ruta] = true;
            }
        }

        $especificacion = json_decode(File::get($this->rutaEspecificacion()), true, 512, JSON_THROW_ON_ERROR);
        $documentadas = array_keys($especificacion['paths'] ?? []);
        $faltantes = array_values(array_diff(array_keys($rutas), $documentadas));
        sort($faltantes);

        $this->assertSame([], $faltantes, 'Rutas con permiso:* sin documentar: '.implode(', ', $faltantes));
    }

    private function rutaEspecificacion(): string
    {
        return base_path('../docs/api/openapi.json');
    }
}
