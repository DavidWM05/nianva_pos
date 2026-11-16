<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CuponTotalNoNegativoTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('tipos')]
    public function test_un_cupon_total_sobre_medio_centavo_no_deja_total_negativo(string $tipo): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        Cupon::factory()->create(['tenant_id' => $tenant->id, 'codigo' => 'TOTAL', 'tipo' => $tipo, ($tipo === 'porcentaje' ? 'porcentaje' : 'monto') => ($tipo === 'porcentaje' ? 100 : 1)]);
        $resultado = app(PricingService::class)->cotizar(new Carrito([], 'TOTAL', 0.005), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame(0.0, $resultado->total);
        $this->assertSame(0.01, $resultado->cupon->descuento);
    }

    #[DataProvider('tipos')]
    public function test_regla_total_sobre_cantidad_fraccionaria_no_deja_total_negativo(string $tipo): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '0.01']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        ReglaPrecio::factory()->create(['tenant_id' => $tenant->id, 'tipo' => $tipo, ($tipo === 'porcentaje' ? 'porcentaje' : 'monto') => ($tipo === 'porcentaje' ? 100 : 1)]);
        $resultado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 0.5)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame(0.0, $resultado->total);
        $this->assertSame(0.01, $resultado->lineas[0]->descuento);
    }

    public static function tipos(): array
    {
        return [['porcentaje'], ['monto_fijo']];
    }
}
