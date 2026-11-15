<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\DecimalApi;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CostoUnitarioApiTest extends TestCase
{
    public static function costos(): array
    {
        return [
            ['0.0035', '0.0035'], ['12', '12.0000'], ['99999999.9999', '99999999.9999'],
            ['0.00005', '0.0001'], ['-0.00005', '-0.0001'], [0.0035, '0.0035'],
        ];
    }

    #[DataProvider('costos')]
    public function test_el_costo_unitario_conserva_cuatro_decimales_sin_perder_precision(string|int|float $valor, string $esperado): void
    {
        $this->assertSame($esperado, DecimalApi::costoUnitario($valor));
    }

    public function test_el_esquema_del_costo_unitario_documenta_su_excepcion_de_cuatro_decimales(): void
    {
        $api = json_decode(file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        $campo = $api['components']['schemas']['InsumoResource']['properties']['costo'];
        $this->assertSame('string', $campo['type']);
        $this->assertSame('^-?[0-9]+\\.[0-9]{4}$', $campo['pattern'] ?? null);
    }
}
