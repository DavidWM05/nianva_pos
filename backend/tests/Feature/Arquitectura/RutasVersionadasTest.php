<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RutasVersionadasTest extends TestCase
{
    public function test_las_rutas_api_estan_versionadas(): void
    {
        $infracciones = [];

        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();

            if (! str_starts_with($uri, 'api/')) {
                continue;
            }

            if (preg_match('#^api/v\d+/#', $uri) !== 1) {
                $infracciones[] = "{$route->methods()[0]} /{$uri} no esta bajo /api/v{{n}}/.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_las_rutas_web_no_exponen_api(): void
    {
        $contenido = file_get_contents(base_path('routes/web.php'));

        $this->assertIsString($contenido);
        $this->assertDoesNotMatchRegularExpression(
            '/Route::(?:get|post|put|patch|delete|any|match)\s*\(\s*[\'"]api\//',
            $contenido,
            'routes/web.php no debe declarar rutas api/.',
        );
    }
}
