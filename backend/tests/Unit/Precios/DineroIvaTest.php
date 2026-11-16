<?php

declare(strict_types=1);

namespace Tests\Unit\Precios;

use App\Modules\Nucleo\Support\Dinero;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DineroIvaTest extends TestCase
{
    #[DataProvider('impuestos')]
    public function test_desglosa_el_impuesto_incluido_con_redondeo_exacto(string $importe, string $tasa, string $esperado): void
    {
        $this->assertSame($esperado, Dinero::desde($importe)->impuestoIncluido($tasa)->aCadena());
    }

    public static function impuestos(): array
    {
        return [
            ['200.00', '16.0000', '27.59'],
            ['116.00', '8.0000', '8.59'],
            ['0.29', '16.0000', '0.04'],
            ['0.07', '16.0000', '0.01'],
            ['100.00', '0.0000', '0.00'],
            ['9999999999.99', '16.0000', '1379310344.83'],
        ];
    }

    public function test_reparte_el_cupon_por_restos_y_conserva_el_orden_en_empates(): void
    {
        $reparto = Dinero::desde('0.02')->repartir([Dinero::desde('1'), Dinero::desde('1'), Dinero::desde('1')]);
        $this->assertSame(['0.01', '0.01', '0.00'], array_map(fn (Dinero $d) => $d->aCadena(), $reparto));
    }

    public function test_reparte_sin_desbordar_el_producto_de_centavos(): void
    {
        $reparto = Dinero::desde('9999999999.99')->repartir([Dinero::desde('9999999999.98'), Dinero::desde('0.01')]);
        $this->assertSame(['9999999999.98', '0.01'], array_map(fn (Dinero $d) => $d->aCadena(), $reparto));
    }
}
