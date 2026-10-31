<?php

namespace Tests\Feature\Aplicacion;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class RegistrarVentaAtomicidadTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas.crear']);
    }

    public function test_si_falla_el_stock_se_revierte_el_descuento_de_la_gift_card_y_la_venta(): void
    {
        MetodoPago::create([
            'tenant_id' => null,
            'nombre' => 'Gift Card',
            'tipo' => 'digital',
        ]);

        $giftCard = GiftCard::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'GC-ATOMICA-1',
            'saldo_inicial' => 100,
            'saldo_actual' => 100,
            'estado' => 'activa',
        ]);

        $stockAntes = (float) InventarioStock::where('variante_id', $this->variante->id)
            ->firstOrFail()
            ->stock_actual;

        $this->actingAs($this->usuario);

        // La variante tiene 50 en stock; se piden 100. La Gift Card alcanza
        // a cubrir 100 y el resto va en efectivo, pero el stock revienta
        // despues de que la Action ya desconto saldo: todo debe revertirse.
        $this->postJson('/api/v1/ventas', [
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 100]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 9900]],
            'gift_card_codigo' => 'GC-ATOMICA-1',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'stock_insuficiente');

        $this->assertSame(0, Venta::count());
        $this->assertSame($stockAntes, (float) InventarioStock::where('variante_id', $this->variante->id)->firstOrFail()->stock_actual);
        $this->assertSame(100.0, (float) $giftCard->fresh()->saldo_actual);
    }
}
