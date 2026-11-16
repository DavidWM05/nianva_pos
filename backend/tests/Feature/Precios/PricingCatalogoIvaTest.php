<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PricingCatalogoIvaTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_iva_default_se_desglosa_sin_cambiar_el_total_cobrado(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '100.00']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $contexto = new ContextoPrecio($tenant->id, null, null, CarbonImmutable::parse('2026-11-15 12:00:00'));
        $resultado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 2)]), $contexto);

        $this->assertSame(200.0, $resultado->total);
        $this->assertSame(27.59, $resultado->lineas[0]->impuesto);
    }

    #[DataProvider('tasas')]
    public function test_resuelve_la_tasa_del_producto_y_la_heredada_del_tenant(?string $tasa, bool $exento, string $default, string $esperada, float $impuesto): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        ConfiguracionTenant::sinTenant()->where('tenant_id', $tenant->id)->update(['tasa_iva_default' => $default]);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '116.00', 'tasa_iva' => $tasa, 'exento_iva' => $exento]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $otro = Tenant::factory()->create();
        app(TenantContext::class)->set($otro);
        $resultado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame(116.0, $resultado->total);
        $this->assertSame($esperada, $resultado->lineas[0]->tasaImpuesto);
        $this->assertSame($exento, $resultado->lineas[0]->exento);
        $this->assertSame($impuesto, $resultado->lineas[0]->impuesto);
        $this->assertSame($impuesto, $resultado->totalImpuestos);
    }

    public static function tasas(): array
    {
        return [
            'hereda 16' => [null, false, '16.0000', '16.0000', 16.0],
            'hereda 8' => [null, false, '8.0000', '8.0000', 8.59],
            'hereda cero' => [null, false, '0.0000', '0.0000', 0.0],
            'propia 8' => ['8.0000', false, '16.0000', '8.0000', 8.59],
            'propia cero' => ['0.0000', false, '16.0000', '0.0000', 0.0],
            'exento distinto de cero' => ['16.0000', true, '8.0000', '16.0000', 0.0],
        ];
    }

    #[DataProvider('precios')]
    public function test_el_precio_de_variante_prevalece_y_null_hereda(?string $precio, float $esperado): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '100.00']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'precio_venta' => $precio]);
        $resultado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame($esperado, $resultado->lineas[0]->precioBase);
        $this->assertSame($esperado, $resultado->total);
        $producto->update(['precio_venta' => '300.00']);
        $actualizado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame($precio === null ? 300.0 : $esperado, $actualizado->total);
    }

    public static function precios(): array
    {
        return ['hereda' => [null, 100.0], 'propio' => ['150.50', 150.5], 'cero propio' => ['0.00', 0.0]];
    }

    public function test_el_cupon_se_reparte_por_resto_mayor_antes_de_desglosar_iva(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $lineas = [];
        foreach (['0.07', '0.07', '0.07'] as $precio) {
            $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => $precio]);
            $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
            $lineas[] = new LineaCarrito($variante->id, 1);
        }
        Cupon::factory()->create(['tenant_id' => $tenant->id, 'codigo' => 'CENTAVOS', 'tipo' => 'monto_fijo', 'monto' => '0.12', 'activo' => true, 'fecha_inicio' => null, 'fecha_fin' => null]);
        $resultado = app(PricingService::class)->cotizar(new Carrito($lineas, 'CENTAVOS'), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame(0.09, $resultado->total);
        $this->assertSame([0.0, 0.0, 0.0], array_map(fn ($linea) => $linea->impuesto, $resultado->lineas));
        $this->assertSame(0.0, $resultado->totalImpuestos);
    }
}
