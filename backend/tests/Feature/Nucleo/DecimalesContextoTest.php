<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException;
use App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException;
use App\Modules\Devoluciones\Exceptions\DevolucionExcedeCantidadVendidaException;
use App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Tpv\Exceptions\PagoNoCuadraException;
use App\Modules\Tpv\Exceptions\VentaTotalNegativoException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DecimalesContextoTest extends TestCase
{
    #[DataProvider('errores')]
    public function test_el_contexto_decimal_conserva_los_ids_y_serializa_los_importes(ExcepcionNegocio $error, array $esperado): void
    {
        $this->assertSame($esperado, $error->contexto());
    }

    public static function errores(): array
    {
        return [
            'pago venta' => [new PagoNoCuadraException(0.3, 0.1), ['total' => '0.30', 'suma_pagos' => '0.10']],
            'total negativo' => [new VentaTotalNegativoException(10, 20, 0), ['subtotal' => '10.00', 'descuento_manual' => '20.00', 'descuento_cupon' => '0.00']],
            'saldo apartado' => [new ApartadoSaldoInsuficienteException(1, 10, 5), ['apartado_id' => 1, 'total' => '10.00', 'total_abonado' => '5.00']],
            'pago abono' => [new AbonoPagoNoCuadraException(10, 5), ['monto' => '10.00', 'suma_pagos' => '5.00']],
            'pago devolucion' => [new DevolucionPagoNoCuadraException(-10, 5), ['diferencia' => '-10.00', 'suma_pagos' => '5.00']],
            'stock' => [new StockInsuficienteException(1, 2, 0.5, 0.1), ['variante_id' => 1, 'sucursal_id' => 2, 'solicitado' => '0.500', 'disponible' => '0.100']],
            'vendido' => [new DevolucionExcedeCantidadVendidaException(1, 2, 1, 0.5), ['venta_id' => 1, 'variante_id' => 2, 'solicitado' => '1.000', 'vendido' => '0.500']],
        ];
    }
}
