<?php

declare(strict_types=1);

namespace Tests\Unit\Precios;

use App\Modules\Nucleo\Support\Dinero;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DineroProporcionTest extends TestCase
{
    #[DataProvider('proporciones')]
    public function test_calcula_proporciones_exactas_sin_float(string $importe, int $numerador, int $denominador, string $esperado): void
    {
        $this->assertSame($esperado, Dinero::desde($importe)->proporcion($numerador, $denominador)->aCadena());
    }

    public static function proporciones(): array
    {
        return [['270', 1, 3, '90.00'], ['0.01', 1, 2, '0.01'], ['9999999999.99', 999999999999, 999999999999, '9999999999.99']];
    }
}
