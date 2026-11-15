<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ReglasCantidadTest extends TestCase
{
    use RefreshDatabase;

    public function test_sin_tenant_solo_se_omite_la_condicion_por_variante(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $pieza = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'es_granel' => false]);
        $reales = ReglasCantidad::paraVariante($tenant->id);
        $documentadas = ReglasCantidad::paraVariante(0);
        $this->assertSame(array_values(array_filter($reales, is_string(...))), $documentadas);
        $this->assertTrue(Validator::make(['cantidad' => 0.5], ['cantidad' => $documentadas])->passes());
        $this->assertFalse(Validator::make(['cantidad' => 0.0001], ['cantidad' => $documentadas])->passes());
        $this->assertFalse(Validator::make(['cantidad' => 0], ['cantidad' => $documentadas])->passes());
        $this->assertFalse(Validator::make(['cantidad' => 100000000000], ['cantidad' => $documentadas])->passes());
        $validator = Validator::make(['cantidad' => 0.5, 'variante_id' => $pieza->id], ['cantidad' => $reales]);
        $this->assertTrue($validator->fails());
        $this->assertSame('La cantidad de una variante por pieza debe ser entera.', $validator->errors()->first('cantidad'));
    }
}
