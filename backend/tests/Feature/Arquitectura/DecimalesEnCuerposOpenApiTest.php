<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * UI-11b: la regla `decimal:min,max` de un FormRequest se documenta en el cuerpo de la
 * peticion como `multipleOf` (10^-max), para que el frontend lea del contrato cuantos
 * decimales acepta cada campo. Las respuestas siguen con su `pattern` D2/D3/D4 (API-02).
 */
class DecimalesEnCuerposOpenApiTest extends TestCase
{
    /** @return array<string, mixed> */
    private function esquemas(): array
    {
        $api = json_decode((string) file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);

        return $api['components']['schemas'];
    }

    /** @return array<string, array{string, string, float}> */
    public static function campos(): array
    {
        return [
            'porcentaje de regla (decimal:0,4)' => ['GuardarReglaPrecioRequest', 'porcentaje', 0.0001],
            'monto de regla (decimal:0,2)' => ['GuardarReglaPrecioRequest', 'monto', 0.01],
            'cantidad de compra de regla (decimal:0,3)' => ['GuardarReglaPrecioRequest', 'cantidad_compra', 0.001],
            'porcentaje de cupon' => ['GuardarCuponRequest', 'porcentaje', 0.0001],
            'monto de cupon' => ['GuardarCuponRequest', 'monto', 0.01],
        ];
    }

    #[DataProvider('campos')]
    public function test_el_cuerpo_documenta_los_decimales_como_multiple_of(string $esquema, string $campo, float $multiplo): void
    {
        $propiedad = $this->esquemas()[$esquema]['properties'][$campo];

        $this->assertArrayHasKey('multipleOf', $propiedad, "{$esquema}.{$campo} sin multipleOf");
        $this->assertEqualsWithDelta($multiplo, $propiedad['multipleOf'], 1e-12);
    }

    public function test_un_campo_sin_regla_decimal_no_inventa_multiple_of(): void
    {
        $this->assertArrayNotHasKey('multipleOf', $this->esquemas()['GuardarProductoRequest']['properties']['precio_venta']);
    }
}
