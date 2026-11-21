<?php

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\CuentasCobrar\RegistrarAbono;
use App\Aplicacion\CuentasPagar\RegistrarPago;
use App\Aplicacion\Gastos\RegistrarGasto;
use App\Aplicacion\GiftCards\RecargarGiftCard;
use App\Modules\CuentasCobrar\Dtos\RegistrarAbonoDto;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Dtos\RegistrarPagoDto;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CerrarCajaTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['caja.cerrar']);
    }

    public function test_el_desglose_y_el_total_teorico_incluyen_gastos_cxc_gift_cards_y_cxp(): void
    {
        $venta = $this->crearVenta();

        app(RegistrarGasto::class)->ejecutar(new CrearGastoDto('Luz', 80), $this->usuario);

        $cuentaCobrar = CuentaCobrar::create([
            'tenant_id' => $this->tenant->id,
            'venta_id' => $venta->id,
            'cliente_id' => $this->cliente->id,
            'monto_total' => 100,
            'saldo_pendiente' => 100,
            'estado' => 'pendiente',
        ]);

        app(RegistrarAbono::class)->ejecutar(new RegistrarAbonoDto(30, $this->metodoPago->id, null), $cuentaCobrar->id, $this->usuario);

        $giftCard = GiftCard::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'GC-CIERRE-1',
            'saldo_inicial' => 20,
            'saldo_actual' => 20,
            'estado' => 'activa',
        ]);

        app(RecargarGiftCard::class)->ejecutar(new RecargarGiftCardDto(20, [new PagoDto($this->metodoPago->id, 20)]), $giftCard->id, $this->usuario);

        $cuentaPagar = CuentaPagar::create([
            'tenant_id' => $this->tenant->id,
            'compra_id' => $this->compra->id,
            'proveedor_id' => $this->proveedor->id,
            'monto_total' => 100,
            'saldo_pendiente' => 100,
            'estado' => 'pendiente',
        ]);

        app(RegistrarPago::class)->ejecutar(new RegistrarPagoDto(10, $this->metodoPago->id, null), $cuentaPagar->id, $this->usuario);

        $this->actingAs($this->usuario);

        // 500 apertura + 100 ventas + 30 CxC + 20 GC - 10 CxP - 80 gastos = 560.
        $this->patchJson("/api/v1/caja/{$this->caja->ulid}/cerrar", ['conteos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 560]]])
            ->assertOk()
            ->assertJsonPath('data.estado', 'cerrada')
            ->assertJsonPath('data.total_ventas_sistema', '100.00')
            ->assertJsonPath('data.monto_cierre', '560.00')
            ->assertJsonPath('data.diferencia', '0.00')
            ->assertJsonPath('desglose.total_gastos', '80.00')
            ->assertJsonPath('desglose.total_abonos_cxc', '30.00')
            ->assertJsonPath('desglose.total_recargas_gc', '20.00')
            ->assertJsonPath('desglose.total_pagos_cxp', '10.00');
    }

    public function test_si_falla_la_lectura_de_gastos_la_caja_sigue_abierta(): void
    {
        $this->mock(GastoService::class, function (MockInterface $mock) {
            $mock->shouldReceive('totalGastos')
                ->once()
                ->andThrow(new \RuntimeException('Fallo simulado al calcular gastos.'));
        });

        $this->actingAs($this->usuario);

        $this->patchJson("/api/v1/caja/{$this->caja->ulid}/cerrar", ['conteos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 500]]])
            ->assertStatus(500);

        $sesion = CajaSesion::findOrFail($this->caja->id);

        $this->assertSame('abierta', $sesion->estado);
        $this->assertNull($sesion->monto_cierre);
    }
}
