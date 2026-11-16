<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingReglaMetadatosTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_regla_expone_prioridad_de_negocio_cero_y_su_descuento(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '100.00']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        ReglaPrecio::factory()->create(['tenant_id' => $tenant->id, 'aplica_a' => 'variante', 'variante_id' => $variante->id, 'tipo' => 'monto_fijo', 'monto' => '10.00']);
        $cotizacion = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));

        $this->assertSame(90.0, $cotizacion->total);
        $this->assertSame(0, $cotizacion->lineas[0]->reglas[0]->prioridad);
        $this->assertSame(10.0, $cotizacion->lineas[0]->reglas[0]->descuento);
    }
}
