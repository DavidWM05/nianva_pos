<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\Dinero;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DineroPromedioTest extends TestCase
{
    #[DataProvider('promedios')]
    public function test_promedia_los_productos_exactos_y_redondea_solo_el_cociente(string $existencia, string $promedio, string $cantidad, string $costo, string $esperado): void
    {
        $this->assertSame($esperado, Dinero::desde($promedio)->promediarEntrada($existencia, Dinero::desde($costo), $cantidad)->aCadena());
    }

    public static function promedios(): array
    {
        return [
            'ponderado' => ['10', '10.00', '30', '20.00', '17.50'],
            'sin existencia' => ['0', '99.00', '2', '12.35', '12.35'],
            'existencia negativa' => ['-4', '99.00', '2', '12.35', '12.35'],
            'medio centavo arriba' => ['0.001', '0.01', '0.001', '0.02', '0.02'],
            'sin redondear cada componente' => ['0.001', '0.01', '0.001', '0.01', '0.01'],
            'fracciones distintas' => ['0.500', '10.00', '0.250', '20.00', '13.33'],
            'cociente periodico' => ['2', '5.00', '1', '10.00', '6.67'],
            'costo cero valido' => ['1', '10.00', '1', '0.00', '5.00'],
            'producto excede entero nativo' => ['49999999999.000', '9999999999.99', '49999999999.000', '9999999999.97', '9999999999.98'],
        ];
    }

    #[DataProvider('entradasInvalidas')]
    public function test_rechaza_cantidad_no_positiva_o_costo_negativo(string $cantidad, string $costo): void
    {
        $this->expectException(InvalidArgumentException::class);
        Dinero::desde('10.00')->promediarEntrada('1', Dinero::desde($costo), $cantidad);
    }

    public static function entradasInvalidas(): array
    {
        return [['0', '1.00'], ['-1', '1.00'], ['1', '-0.01']];
    }
}
