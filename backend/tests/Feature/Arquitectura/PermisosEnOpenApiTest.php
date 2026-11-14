<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * API-08b: en los listados, meta.permisos es un booleano por acción. El OpenAPI
 * generado debe documentarlo como objeto de booleanos (no como lista), para que el
 * frontend lo tipe sin casts.
 */
class PermisosEnOpenApiTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function listadosConPermisos(): array
    {
        return [
            'interacciones de clientes' => ['/clientes/{cliente}/interacciones'],
            'cuentas por cobrar' => ['/cuentas-cobrar'],
            'cuentas por pagar' => ['/cuentas-pagar'],
            'gift cards' => ['/gift-cards'],
            'notas de credito' => ['/notas-credito'],
            'prestamos' => ['/prestamos'],
        ];
    }

    #[DataProvider('listadosConPermisos')]
    public function test_meta_permisos_es_objeto_de_booleanos(string $ruta): void
    {
        $especificacion = json_decode(File::get(base_path('../docs/api/openapi.json')), true, 512, JSON_THROW_ON_ERROR);
        $esquema = $especificacion['paths'][$ruta]['get']['responses']['200']['content']['application/json']['schema'] ?? null;

        $this->assertIsArray($esquema, "GET {$ruta}: sin esquema de respuesta 200.");

        $permisos = $esquema['properties']['meta']['properties']['permisos'] ?? null;

        $this->assertSame(
            ['type' => 'object', 'additionalProperties' => ['type' => 'boolean']],
            $permisos,
            "GET {$ruta}: meta.permisos debe documentarse como objeto de booleanos.",
        );
    }
}
