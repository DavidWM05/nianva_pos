<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\CuentasCobrar\AnularCuenta;
use App\Aplicacion\CuentasCobrar\CrearDesdeVenta;
use App\Aplicacion\CuentasCobrar\RegistrarAbono;
use App\Aplicacion\CuentasPagar\CrearDesdeCompra;
use App\Aplicacion\CuentasPagar\RegistrarPago;
use App\Aplicacion\GiftCards\CancelarGiftCard;
use App\Aplicacion\GiftCards\CargarGiftCard;
use App\Aplicacion\GiftCards\EmitirGiftCard;
use App\Aplicacion\GiftCards\RecargarGiftCard;
use App\Aplicacion\NotasCredito\AplicarNotaCredito;
use App\Aplicacion\NotasCredito\CrearDesdeDevolucion;
use App\Aplicacion\VentasPlazos\CrearPlanPago;
use App\Aplicacion\VentasPlazos\GenerarCuotas;
use App\Aplicacion\VentasPlazos\MarcarCuotaPagada;
use App\Aplicacion\VentasPlazos\PagarCuota;
use App\Modules\CuentasCobrar\Dtos\RegistrarAbonoDto;
use App\Modules\CuentasCobrar\Exceptions\CuentaConAbonosException;
use App\Modules\CuentasPagar\Dtos\RegistrarPagoDto;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarConAbonosException;
use App\Modules\GiftCards\Dtos\CargarGiftCardDto;
use App\Modules\GiftCards\Dtos\EmitirGiftCardDto;
use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\NotasCredito\Dtos\AplicarNotaCreditoDto;
use App\Modules\VentasPlazos\Dtos\CrearPlanPagoDto;
use App\Modules\VentasPlazos\Dtos\PagarCuotaDto;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\PreparaArq04d;
use Tests\TestCase;

class ActionsSaldosTest extends TestCase
{
    use PreparaArq04d;
    use RefreshDatabase;

    public function test_crear_cxc_y_anular_sin_abonos(): void
    {
        $d = $this->negocio04d();
        $cuenta = app(CrearDesdeVenta::class)->ejecutar($d['venta']->id);
        $this->assertSame(100.0, (float) $cuenta->saldo_pendiente);
        app(AnularCuenta::class)->ejecutar($cuenta->id);
        $this->assertSame('anulada', $cuenta->fresh()->estado);
    }

    public function test_crear_cxp_y_anular_sin_pagos(): void
    {
        $d = $this->negocio04d();
        $cuenta = app(CrearDesdeCompra::class)->ejecutar($d['compra']->id);
        $this->assertSame(100.0, (float) $cuenta->saldo_pendiente);
        app(\App\Aplicacion\CuentasPagar\AnularCuenta::class)->ejecutar($cuenta->id);
        $this->assertSame('anulada', $cuenta->fresh()->estado);
    }

    public function test_abonar_cxc_usa_la_caja_del_usuario_y_no_se_puede_anular(): void
    {
        $d = $this->negocio04d();
        $abono = app(RegistrarAbono::class)->ejecutar(new RegistrarAbonoDto(30, $d['metodo']->id, 'abono'), $d['cxc']->id, $d['usuario']);
        $this->assertSame($d['caja']->id, $abono->caja_sesion_id);
        $this->assertSame(70.0, (float) $d['cxc']->fresh()->saldo_pendiente);
        $this->expectException(CuentaConAbonosException::class);
        app(AnularCuenta::class)->ejecutar($d['cxc']->id);
    }

    public function test_pagar_cxp_usa_la_caja_del_usuario_y_no_se_puede_anular(): void
    {
        $d = $this->negocio04d();
        $pago = app(RegistrarPago::class)->ejecutar(new RegistrarPagoDto(30, $d['metodo']->id, null), $d['cxp']->id, $d['usuario']);
        $this->assertSame($d['caja']->id, $pago->caja_sesion_id);
        $this->assertSame(70.0, (float) $d['cxp']->fresh()->saldo_pendiente);
        $this->expectException(CuentaPagarConAbonosException::class);
        app(\App\Aplicacion\CuentasPagar\AnularCuenta::class)->ejecutar($d['cxp']->id);
    }

    public function test_emitir_recargar_cargar_y_cancelar_gift_card(): void
    {
        $d = $this->negocio04d();
        $gift = app(EmitirGiftCard::class)->ejecutar(new EmitirGiftCardDto($d['cliente']->id, 100, null), $d['tenant']->id);
        $this->assertSame(100.0, (float) $gift->saldo_actual);
        $recargada = app(RecargarGiftCard::class)->ejecutar(new RecargarGiftCardDto(20), $gift->id, $d['usuario']);
        $this->assertSame(120.0, (float) $recargada->saldo_actual);
        $this->assertDatabaseHas('gift_card_recargas', ['gift_card_id' => $gift->id, 'caja_sesion_id' => $d['caja']->id, 'monto' => 20]);
        app(CargarGiftCard::class)->ejecutar(new CargarGiftCardDto($gift->id, 120));
        $this->assertSame(0.0, (float) $gift->fresh()->saldo_actual);
        $this->assertSame('usada', $gift->fresh()->estado);
        app(CancelarGiftCard::class)->ejecutar($gift->id);
        $this->assertSame('cancelada', $gift->fresh()->estado);
    }

    public function test_crear_nota_desde_devolucion_y_aplicarla_a_venta(): void
    {
        $d = $this->negocio04d();
        $nota = app(CrearDesdeDevolucion::class)->ejecutar($d['devolucion']->id);
        $this->assertSame(100.0, (float) $nota->saldo_disponible);
        app(AplicarNotaCredito::class)->ejecutar(new AplicarNotaCreditoDto($nota->id, $d['venta']->id, 100));
        $this->assertSame(0.0, (float) $nota->fresh()->saldo_disponible);
        $this->assertSame('usada_total', $nota->fresh()->estado);
        $this->assertDatabaseHas('nota_credito_usos', ['nota_credito_id' => $nota->id, 'venta_id' => $d['venta']->id, 'monto_usado' => 100]);
    }

    public function test_crear_plan_y_pagar_cuota(): void
    {
        $d = $this->negocio04d();
        $plan = app(CrearPlanPago::class)->ejecutar(new CrearPlanPagoDto(2, 10, 'mensual', null, ['tasa_interes', 'periodicidad']), $d['venta']->id);
        $this->assertSame(110.0, (float) $plan->monto_total);
        $this->assertCount(2, $plan->cuotas);
        $cuota = $plan->cuotas->first();
        $pagada = app(PagarCuota::class)->ejecutar(new PagarCuotaDto($cuota->id, null, []), $plan->id);
        $this->assertSame('pagada', $pagada->estado);
        $this->assertNotNull($pagada->fecha_pago_real);
    }

    public function test_generar_cuotas_reparte_centavos_y_marcar_pagada(): void
    {
        $d = $this->negocio04d();
        $d['cuota']->delete();
        $cuotas = app(GenerarCuotas::class)->ejecutar($d['plan']->id, 3);
        $this->assertSame(100.0, (float) $cuotas->sum('monto'));
        $this->assertSame(33.34, (float) $cuotas->last()->monto);
        $pagada = app(MarcarCuotaPagada::class)->ejecutar($d['plan']->id, $cuotas->first()->id);
        $this->assertSame('pagada', $pagada->estado);
        $this->assertNotNull($pagada->fecha_pago);
    }

    public function test_pago_no_puede_usar_una_cuota_de_otro_plan(): void
    {
        $d = $this->negocio04d();
        $otro = PlanPagoCliente::factory()->create(['tenant_id' => $d['tenant']->id, 'cliente_id' => $d['cliente']->id]);
        $this->expectException(ModelNotFoundException::class);
        app(PagarCuota::class)->ejecutar(new PagarCuotaDto($d['cuota']->id, 100, ['monto']), $otro->id);
    }

    public function test_rollback_exterior_restaura_saldos_y_movimientos_de_todas_las_extensiones(): void
    {
        $d = $this->negocio04d();
        $nivel = DB::transactionLevel();
        DB::beginTransaction();
        try {
            app(RegistrarAbono::class)->ejecutar(new RegistrarAbonoDto(30, $d['metodo']->id, null), $d['cxc']->id, $d['usuario']);
            app(RegistrarPago::class)->ejecutar(new RegistrarPagoDto(30, $d['metodo']->id, null), $d['cxp']->id, $d['usuario']);
            app(RecargarGiftCard::class)->ejecutar(new RecargarGiftCardDto(20), $d['gift']->id, $d['usuario']);
            app(CargarGiftCard::class)->ejecutar(new CargarGiftCardDto($d['gift']->id, 30));
            app(AplicarNotaCredito::class)->ejecutar(new AplicarNotaCreditoDto($d['nota']->id, $d['venta']->id, 30));
            app(PagarCuota::class)->ejecutar(new PagarCuotaDto($d['cuota']->id, 100, ['monto']), $d['plan']->id);
            $this->assertSame($nivel + 1, DB::transactionLevel());
        } finally {
            DB::rollBack();
        }
        foreach (['cxc' => 'saldo_pendiente', 'cxp' => 'saldo_pendiente', 'gift' => 'saldo_actual', 'nota' => 'saldo_disponible'] as $modelo => $saldo) {
            $this->assertSame(100.0, (float) $d[$modelo]->fresh()->getAttribute($saldo));
        }
        $this->assertSame('pendiente', $d['cuota']->fresh()->estado);
        foreach (['abonos_cuenta', 'abonos_pagar', 'gift_card_recargas', 'nota_credito_usos'] as $tabla) {
            $this->assertDatabaseCount($tabla, 0);
        }
    }
}
