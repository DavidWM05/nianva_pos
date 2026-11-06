<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use Illuminate\Database\Eloquent\Model;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class Nucleos04dRequierenTransaccionTest extends TestCase
{
    #[DataProvider('nucleos')]
    public function test_ningun_nucleo_escribe_sin_transaccion(string $servicio, string $metodo, array $argumentos): void
    {
        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('La escritura de saldos requiere una transacción activa.');
        app($servicio)->$metodo(...array_map(static fn ($a) => is_string($a) && is_subclass_of($a, Model::class) ? new $a : $a, $argumentos));
    }

    public static function nucleos(): array
    {
        $m = 'App\\Modules\\';

        return [
            'crear cxc' => [$m.'CuentasCobrar\\Services\\CuentasCobrarService', 'crearDesdeVenta', [$m.'Tpv\\Models\\Venta']],
            'abonar cxc' => [$m.'CuentasCobrar\\Services\\CuentasCobrarService', 'registrarAbonoConBloqueos', [$m.'CuentasCobrar\\Models\\CuentaCobrar', [], null]],
            'anular cxc' => [$m.'CuentasCobrar\\Services\\CuentasCobrarService', 'anularConCuenta', [$m.'CuentasCobrar\\Models\\CuentaCobrar']],
            'crear cxp' => [$m.'CuentasPagar\\Services\\CuentasPagarService', 'crearDesdeCompra', [$m.'Inventario\\Models\\Compra']],
            'pagar cxp' => [$m.'CuentasPagar\\Services\\CuentasPagarService', 'registrarPagoConBloqueos', [$m.'CuentasPagar\\Models\\CuentaPagar', [], null]],
            'anular cxp' => [$m.'CuentasPagar\\Services\\CuentasPagarService', 'anularConCuenta', [$m.'CuentasPagar\\Models\\CuentaPagar']],
            'emitir gift' => [$m.'GiftCards\\Services\\GiftCardService', 'emitir', [[]]],
            'recargar gift' => [$m.'GiftCards\\Services\\GiftCardService', 'recargarConTarjeta', [$m.'GiftCards\\Models\\GiftCard', 10, 1]],
            'cargar gift' => [$m.'GiftCards\\Services\\GiftCardService', 'descontarSaldoConTarjeta', [$m.'GiftCards\\Models\\GiftCard', 10]],
            'cancelar gift' => [$m.'GiftCards\\Services\\GiftCardService', 'cancelarConTarjeta', [$m.'GiftCards\\Models\\GiftCard']],
            'crear nota' => [$m.'NotasCredito\\Services\\NotaCreditoService', 'crearDesdeDevolucion', [$m.'Devoluciones\\Models\\Devolucion']],
            'aplicar nota' => [$m.'NotasCredito\\Services\\NotaCreditoService', 'usarEnVentaConNota', [$m.'NotasCredito\\Models\\NotaCredito', 1, 10]],
            'crear plan' => [$m.'VentasPlazos\\Services\\VentasPlazosService', 'crearPlan', [$m.'Tpv\\Models\\Venta', []]],
            'pagar cuota' => [$m.'VentasPlazos\\Services\\VentasPlazosService', 'pagarCuotaConCuota', [$m.'VentasPlazos\\Models\\PlanPagoClienteCuota', []]],
            'generar cuotas' => [$m.'VentasPlazos\\Services\\PlanPagoClienteService', 'generarCuotas', [$m.'VentasPlazos\\Models\\PlanPagoCliente', 2]],
            'marcar pagada' => [$m.'VentasPlazos\\Services\\PlanPagoClienteService', 'marcarPagada', [$m.'VentasPlazos\\Models\\PlanPagoClienteCuota']],
        ];
    }
}
