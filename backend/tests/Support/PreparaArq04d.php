<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Inventario\Models\Compra;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;

trait PreparaArq04d
{
    use PreparaArq04b;

    private function negocio04d(): array
    {
        $d = $this->negocio04b();
        $d['venta'] = Venta::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id, 'caja_sesion_id' => $d['caja']->id, 'total' => 100]);
        $d['compra'] = Compra::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id, 'proveedor_id' => $d['proveedor']->id, 'total' => 100]);
        $d['cxc'] = CuentaCobrar::factory()->create(['venta_id' => $d['venta']->id]);
        $d['cxp'] = CuentaPagar::factory()->create(['compra_id' => $d['compra']->id]);
        $d['gift'] = GiftCard::factory()->create(['tenant_id' => $d['tenant']->id, 'cliente_id' => $d['cliente']->id, 'saldo_inicial' => 100, 'saldo_actual' => 100]);
        $d['devolucion'] = Devolucion::factory()->create(['venta_id' => $d['venta']->id, 'monto_devolucion' => 100]);
        $d['nota'] = NotaCredito::factory()->create(['devolucion_id' => $d['devolucion']->id]);
        $d['plan'] = PlanPagoCliente::factory()->create(['tenant_id' => $d['tenant']->id, 'cliente_id' => $d['cliente']->id]);
        $d['cuota'] = PlanPagoClienteCuota::factory()->create(['plan_pago_cliente_id' => $d['plan']->id, 'monto' => 100]);

        return $d;
    }
}
