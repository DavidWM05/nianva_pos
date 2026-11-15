<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Cotizaciones\Exceptions\CotizacionTotalNegativoException;
use App\Modules\CuentasCobrar\Exceptions\AbonoExcedeSaldoException;
use App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException;
use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Prestamos\Exceptions\PagoExcedeSaldoPrestamoException;
use App\Modules\VentasPlazos\Exceptions\PagoCuotaInsuficienteException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DecimalesContextosExtensionesTest extends TestCase
{
    public static function excepciones(): array
    {
        return [
            [new CotizacionTotalNegativoException(10.5, 20), ['subtotal' => '10.50', 'descuento' => '20.00']],
            [new AbonoExcedeSaldoException(10.5, 20), ['saldo_pendiente' => '10.50', 'monto_abono' => '20.00']],
            [new PagoExcedeSaldoException(10.5, 20), ['saldo_pendiente' => '10.50', 'monto_pago' => '20.00']],
            [new PagoExcedeSaldoPrestamoException(10.5, 20), ['saldo_pendiente' => '10.50', 'monto_pago' => '20.00']],
            [new PagoCuotaInsuficienteException(7, 10.5, 5), ['cuota_id' => 7, 'monto_requerido' => '10.50', 'monto_recibido' => '5.00']],
        ];
    }

    #[DataProvider('excepciones')]
    public function test_el_contexto_conserva_ids_enteros_y_serializa_los_importes(ExcepcionNegocio $excepcion, array $esperado): void
    {
        $this->assertSame($esperado, $excepcion->contexto());
    }
}
