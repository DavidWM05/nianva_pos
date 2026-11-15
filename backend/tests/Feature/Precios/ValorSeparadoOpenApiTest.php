<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Nucleo\Support\DecimalApi;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DAT-02b: el contrato de reglas de precio y cupones documenta `porcentaje` como tasa (cadena
 * con 4 decimales) y `monto` como dinero (D2), y ya no expone `valor`.
 */
class ValorSeparadoOpenApiTest extends TestCase
{
    private const VALIDAR = '/cupones/validar';

    /** @return array<string, mixed> */
    private function api(): array
    {
        return json_decode((string) file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    /** @return array<string, array{string}> */
    public static function respuestas(): array
    {
        return [
            'regla de precio' => ['ReglaPrecioResource'],
            'cupon' => ['CuponResource'],
            'cupon validado' => [self::VALIDAR],
        ];
    }

    /** @return array<string, mixed> */
    private function propiedades(string $origen): array
    {
        $api = $this->api();
        if ($origen === self::VALIDAR) {
            return $api['paths'][self::VALIDAR]['post']['responses']['200']['content']['application/json']['schema']['properties']['data']['properties']['cupon']['properties'];
        }

        return $api['components']['schemas'][$origen]['properties'];
    }

    #[DataProvider('respuestas')]
    public function test_la_respuesta_documenta_porcentaje_como_tasa_y_monto_como_dinero(string $origen): void
    {
        $propiedades = $this->propiedades($origen);

        $this->assertArrayNotHasKey('valor', $propiedades);
        $this->assertSame(['string', 'null'], (array) $propiedades['porcentaje']['type']);
        $this->assertSame(DecimalApi::PATRON_CUATRO_DECIMALES, $propiedades['porcentaje']['pattern'] ?? null);
        $this->assertSame(['string', 'null'], (array) $propiedades['monto']['type']);
        $this->assertSame(DecimalApi::PATRON_DINERO, $propiedades['monto']['pattern'] ?? null);
    }

    /** @return array<string, array{string, string}> */
    public static function cuerpos(): array
    {
        return [
            'alta de regla' => ['/reglas-precio', 'post'],
            'edicion de regla' => ['/reglas-precio/{regla}', 'put'],
            'alta de cupon' => ['/cupones', 'post'],
            'edicion de cupon' => ['/cupones/{cupon}', 'put'],
        ];
    }

    #[DataProvider('cuerpos')]
    public function test_el_cuerpo_acepta_porcentaje_y_monto_opcionales_y_no_valor(string $ruta, string $metodo): void
    {
        $api = $this->api();
        $this->assertArrayHasKey($ruta, $api['paths'], "Sin la ruta {$ruta}.");
        $esquema = $api['paths'][$ruta][$metodo]['requestBody']['content']['application/json']['schema'];
        if (isset($esquema['$ref'])) {
            $esquema = $api['components']['schemas'][substr($esquema['$ref'], strlen('#/components/schemas/'))];
        }

        $this->assertArrayNotHasKey('valor', $esquema['properties']);
        $this->assertArrayHasKey('porcentaje', $esquema['properties']);
        $this->assertArrayHasKey('monto', $esquema['properties']);
        $this->assertNotContains('porcentaje', $esquema['required'] ?? []);
        $this->assertNotContains('monto', $esquema['required'] ?? []);
    }
}
