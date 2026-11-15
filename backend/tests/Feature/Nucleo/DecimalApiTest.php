<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\DecimalApi;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DecimalApiTest extends TestCase
{
    #[DataProvider('decimales')]
    public function test_serializa_el_decimal_sin_float_json(string|int|float $valor, string $dinero, string $cantidad): void
    {
        $this->assertSame($dinero, DecimalApi::dinero($valor));
        $this->assertSame($cantidad, DecimalApi::cantidad($valor));
        $this->assertSame(json_encode(['dinero' => $dinero, 'cantidad' => $cantidad]), json_encode(['dinero' => DecimalApi::dinero($valor), 'cantidad' => DecimalApi::cantidad($valor)]));
    }

    public static function decimales(): array
    {
        return [
            'cero' => [0, '0.00', '0.000'],
            'entero' => [1250, '1250.00', '1250.000'],
            'cadena' => ['1250.50', '1250.50', '1250.500'],
            'fraccion' => ['0.005', '0.01', '0.005'],
            'negativo' => ['-0.005', '-0.01', '-0.005'],
            'borde de calculo anterior' => [0.5, '0.50', '0.500'],
            'maximo dinero' => ['9999999999.99', '9999999999.99', '9999999999.990'],
        ];
    }

    #[DataProvider('importesCalculados')]
    public function test_conserva_la_precision_del_float_en_el_borde_de_serializacion(float $valor, string $esperado): void
    {
        $this->assertSame($esperado, DecimalApi::dinero($valor));
    }

    public static function importesCalculados(): array
    {
        return [
            'agregado grande' => [1000000000000.99, '1000000000000.99'],
            'medio centavo' => [1.005, '1.01'],
            'exponente pequeno' => [1.0e-7, '0.00'],
            'exponente negativo' => [-1.0e-7, '0.00'],
            'exponente grande' => [1.0e16, '10000000000000000.00'],
        ];
    }
}
