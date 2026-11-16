<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\Cantidad;
use InvalidArgumentException;
use OverflowException;
use Tests\TestCase;

class CantidadPresentacionTest extends TestCase
{
    public function test_multiplica_en_unidad_base_sin_truncar_ni_desbordar(): void
    {
        $this->assertSame(12, Cantidad::multiplicar(2, '6.000'));
        $this->assertSame(0.25, Cantidad::multiplicar('0.500', '0.500'));
        $this->assertSame('99999999999.999', Cantidad::cadena(Cantidad::multiplicar('99999999999.999', '1.000')));
    }

    public function test_rechaza_producto_que_no_cabe_en_tres_decimales(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Cantidad::multiplicar('0.001', '0.001');
    }

    public function test_rechaza_desbordamiento_antes_del_producto_nativo(): void
    {
        $this->expectException(OverflowException::class);
        Cantidad::multiplicar('99999999999.999', '2.000');
    }
}
