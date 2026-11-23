<?php

declare(strict_types=1);

namespace Tests\Feature\Tpv;

use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class IvaDescuentoManualTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_el_iva_guardado_y_el_impreso_reflejan_el_descuento_manual(): void
    {
        $this->prepararNegocio(['ventas.crear', 'ventas.ver']);
        $this->producto->update(['precio_venta' => 116, 'tasa_iva' => 16]);

        $ulid = $this->actingAs($this->usuario)->postJson('/api/v1/ventas', $this->payloadVenta([
            'descuento_manual' => '11.60',
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => '104.40']],
        ]))->assertCreated()->assertJsonPath('data.total', '104.40')->json('data.id');

        $venta = Venta::query()->where('ulid', $ulid)->firstOrFail();
        $impreso = $this->getJson("/api/v1/ventas/{$ulid}/impreso")
            ->assertOk()->assertJsonPath('data.totales.total', '104.40')
            ->assertJsonPath('data.lineas.0.importe_efectivo', '104.40');

        $this->assertSame(
            ['14.40', '14.40'],
            [$venta->detalles()->sole()->impuesto, $impreso->json('data.lineas.0.impuesto')],
        );
        $this->assertSame('104.40', $venta->detalles()->sole()->importe_efectivo);
    }

    public function test_reparte_un_centavo_en_orden_estable_y_devuelve_la_foto_efectiva(): void
    {
        $this->prepararNegocio(['ventas.crear', 'ventas.ver', 'devoluciones.crear']);
        $this->producto->update(['precio_venta' => 23.2, 'tasa_iva' => 16]);

        $ulid = $this->actingAs($this->usuario)->postJson('/api/v1/ventas', $this->payloadVenta([
            'items' => [
                ['variante_id' => $this->variante->id, 'cantidad' => 2],
                ['variante_id' => $this->varianteExtra->id, 'cantidad' => 2],
            ],
            'descuento_manual' => '0.03',
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => '92.77']],
        ]))->assertCreated()->assertJsonPath('data.total', '92.77')->json('data.id');

        $venta = Venta::query()->where('ulid', $ulid)->firstOrFail();
        $this->assertSame(['46.38', '46.39'], $venta->detalles()->orderBy('id')->pluck('importe_efectivo')->all());

        $datos = [
            'venta_id' => $ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => '23.19']],
        ];
        $token = self::conSupervisor($this->usuario, AccionSupervisor::Reembolsar, $datos, $ulid)->token;
        $this->postJson('/api/v1/devoluciones', $datos, ['X-Autorizacion-Supervisor' => $token])->assertCreated();

        $devuelto = DevolucionItem::query()->sole();
        $this->assertSame('23.19', $devuelto->subtotal);
        $this->assertSame('3.20', $devuelto->impuesto);
    }
}
