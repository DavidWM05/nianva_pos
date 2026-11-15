<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\Cantidad;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CantidadTest extends TestCase
{
    #[DataProvider('cantidades')]
    public function test_cuantiza_a_milesimas_y_conserva_numeros_publicos(string $valor, string $cadena, int|float $numero): void
    {
        $this->assertSame($cadena, Cantidad::cadena($valor));
        $this->assertSame($numero, Cantidad::numero($valor));
    }

    public static function cantidades(): array
    {
        return [['0', '0.000', 0], ['1', '1.000', 1], ['0.5', '0.500', 0.5],
            ['0.001', '0.001', 0.001], ['-0.125', '-0.125', -0.125],
            ['1.2345', '1.235', 1.235], ['-1.2345', '-1.235', -1.235],
            ['99999999999.999', '99999999999.999', 99999999999.999]];
    }

    public function test_suma_y_resta_milesimas_sin_acumular_error_binario(): void
    {
        $this->assertSame(0.3, Cantidad::sumar('0.1', '0.2'));
        $this->assertSame(0.5, Cantidad::restar('1', '0.5'));
        $this->assertSame(10000000000, Cantidad::restar('10000000000.001', '0.001'));
        $this->assertSame(0, Cantidad::restar('0.3', Cantidad::sumar('0.1', '0.2')));
    }
}
