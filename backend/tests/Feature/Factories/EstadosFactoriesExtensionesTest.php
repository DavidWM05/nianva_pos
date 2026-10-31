<?php

namespace Tests\Feature\Factories;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstadosFactoriesExtensionesTest extends TestCase
{
    use RefreshDatabase;

    public function test_cotizacion_convertida(): void
    {
        $cotizacion = Cotizacion::factory()->convertida()->create();

        $this->assertSame('convertida', $cotizacion->estado);
        $this->assertNotNull($cotizacion->venta_id);
        $venta = Venta::query()->withoutGlobalScopes()->findOrFail($cotizacion->venta_id);
        $this->assertSame($cotizacion->tenant_id, $venta->tenant_id);
    }

    public function test_cotizacion_anulada(): void
    {
        $cotizacion = Cotizacion::factory()->anulada()->create();

        $this->assertSame('anulada', $cotizacion->estado);
    }

    public function test_cotizacion_vencida(): void
    {
        $cotizacion = Cotizacion::factory()->vencida()->create();

        $this->assertSame('vencida', $cotizacion->estado);
        $this->assertTrue($cotizacion->fecha_vencimiento->isPast());
    }

    public function test_cuenta_cobrar_pagada(): void
    {
        $cuenta = CuentaCobrar::factory()->pagada()->create();

        $this->assertSame('pagada', $cuenta->estado);
        $this->assertSame(0.0, (float) $cuenta->saldo_pendiente);
    }

    public function test_cuenta_cobrar_anulada(): void
    {
        $cuenta = CuentaCobrar::factory()->anulada()->create();

        $this->assertSame('anulada', $cuenta->estado);
    }

    public function test_cuenta_pagar_pagada(): void
    {
        $cuenta = CuentaPagar::factory()->pagada()->create();

        $this->assertSame('pagada', $cuenta->estado);
        $this->assertSame(0.0, (float) $cuenta->saldo_pendiente);
    }

    public function test_cuenta_pagar_anulada(): void
    {
        $cuenta = CuentaPagar::factory()->anulada()->create();

        $this->assertSame('anulada', $cuenta->estado);
    }

    public function test_gift_card_cancelada(): void
    {
        $giftCard = GiftCard::factory()->cancelada()->create();

        $this->assertSame('cancelada', $giftCard->estado);
    }

    public function test_gift_card_usada(): void
    {
        $giftCard = GiftCard::factory()->usada()->create();

        $this->assertSame('usada', $giftCard->estado);
        $this->assertSame(0.0, (float) $giftCard->saldo_actual);
    }

    public function test_gift_card_expirada(): void
    {
        $giftCard = GiftCard::factory()->expirada()->create();

        $this->assertSame('expirada', $giftCard->estado);
        $this->assertTrue($giftCard->fecha_expiracion->isPast());
    }

    public function test_pedido_preparando(): void
    {
        $pedido = Pedido::factory()->preparando()->create();

        $this->assertSame('preparando', $pedido->estado);
    }

    public function test_pedido_en_camino(): void
    {
        $pedido = Pedido::factory()->enCamino()->create();

        $this->assertSame('en_camino', $pedido->estado);
    }

    public function test_pedido_entregado(): void
    {
        $pedido = Pedido::factory()->entregado()->create();

        $this->assertSame('entregado', $pedido->estado);
        $this->assertNotNull($pedido->fecha_entrega);
    }

    public function test_pedido_cancelado(): void
    {
        $pedido = Pedido::factory()->cancelado()->create();

        $this->assertSame('cancelado', $pedido->estado);
    }

    public function test_nomina_pagada(): void
    {
        $nomina = Nomina::factory()->pagada()->create();

        $this->assertSame('pagada', $nomina->estado);
        $this->assertNotNull($nomina->fecha_pago);
    }

    public function test_nomina_cancelada(): void
    {
        $nomina = Nomina::factory()->cancelada()->create();

        $this->assertSame('cancelada', $nomina->estado);
    }

    public function test_prestamo_pagado(): void
    {
        $prestamo = Prestamo::factory()->pagado()->create();

        $this->assertSame('pagado', $prestamo->estado);
        $this->assertSame(0.0, (float) $prestamo->saldo_pendiente);
    }

    public function test_prestamo_cancelado(): void
    {
        $prestamo = Prestamo::factory()->cancelado()->create();

        $this->assertSame('cancelado', $prestamo->estado);
    }

    public function test_orden_produccion_completada(): void
    {
        $orden = OrdenProduccion::factory()->completada()->create();

        $this->assertSame('completada', $orden->estado);
        $this->assertSame($orden->cantidad_programada, $orden->cantidad_producida);
        $this->assertNotNull($orden->fecha_completada);
    }

    public function test_orden_produccion_cancelada(): void
    {
        $orden = OrdenProduccion::factory()->cancelada()->create();

        $this->assertSame('cancelada', $orden->estado);
    }

    public function test_nota_credito_usada_parcial(): void
    {
        $nota = NotaCredito::factory()->usadaParcial()->create();

        $this->assertSame('usada_parcial', $nota->estado);
        $this->assertSame(50.0, (float) $nota->saldo_disponible);
    }

    public function test_nota_credito_usada_total(): void
    {
        $nota = NotaCredito::factory()->usadaTotal()->create();

        $this->assertSame('usada_total', $nota->estado);
        $this->assertSame(0.0, (float) $nota->saldo_disponible);
    }

    public function test_nota_credito_expirada(): void
    {
        $nota = NotaCredito::factory()->expirada()->create();

        $this->assertSame('expirada', $nota->estado);
        $this->assertTrue($nota->fecha_expiracion->isPast());
    }

    public function test_unidad_medida_global(): void
    {
        $unidad = UnidadMedida::factory()->global()->create();

        $this->assertNull($unidad->tenant_id);
        $this->assertTrue($unidad->esGlobal());
    }
}
