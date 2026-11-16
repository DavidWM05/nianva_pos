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

class PricingDineroTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('lineas')]
    public function test_redondea_cada_linea_y_suma_los_importes_sin_cambiar_los_dto(string $precio, int $cantidad, array $regla, int $repeticiones, float $descuento, float $totalLinea, float $total): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => $precio]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        ReglaPrecio::factory()->create(array_merge([
            'tenant_id' => $tenant->id, 'aplica_a' => 'variante', 'variante_id' => $variante->id,
            'activo' => true, 'fecha_inicio' => null, 'fecha_fin' => null,
        ], $regla));
        $carrito = new Carrito(array_fill(0, $repeticiones, new LineaCarrito($variante->id, $cantidad)));
        $resultado = app(PricingService::class)->cotizar($carrito, new ContextoPrecio($tenant->id, null, null, CarbonImmutable::parse('2026-11-14'), 1));
        foreach ($resultado->lineas as $linea) {
            $this->assertSame((float) $precio, $linea->precioBase);
            $this->assertSame($descuento, $linea->descuento);
            $this->assertSame($totalLinea, $linea->total);
        }
        $this->assertSame($total, $resultado->subtotal);
        $this->assertSame($total, $resultado->total);
    }

    public static function lineas(): array
    {
        return [
            'medio centavo por linea' => ['0.05', 1, ['tipo' => 'porcentaje', 'porcentaje' => '10'], 2, 0.01, 0.04, 0.08],
            'porcentaje decimal' => ['12.35', 3, ['tipo' => 'porcentaje', 'porcentaje' => '12.50'], 1, 4.63, 32.42, 32.42],
            'monto fijo por unidad' => ['0.08', 3, ['tipo' => 'monto_fijo', 'monto' => '0.03'], 1, 0.09, 0.15, 0.15],
            'monto fijo limitado al precio' => ['0.08', 3, ['tipo' => 'monto_fijo', 'monto' => '1.00'], 1, 0.24, 0.0, 0.0],
            'nxm con resto' => ['33.33', 7, ['tipo' => 'nxm', 'cantidad_compra' => 3, 'cantidad_paga' => 2], 1, 66.66, 166.65, 166.65],
            'bundle con resto' => ['0.10', 7, ['tipo' => 'bundle', 'cantidad_compra' => 3, 'precio_bundle' => '0.25'], 1, 0.10, 0.60, 0.60],
            'porcentaje sin valor conserva cero' => ['0.10', 3, ['tipo' => 'porcentaje', 'porcentaje' => null], 1, 0.0, 0.30, 0.30],
            'monto fijo sin valor conserva cero' => ['0.10', 3, ['tipo' => 'monto_fijo', 'monto' => null], 1, 0.0, 0.30, 0.30],
            'bundle mas caro no descuenta' => ['0.10', 3, ['tipo' => 'bundle', 'cantidad_compra' => 3, 'precio_bundle' => '0.40'], 1, 0.0, 0.30, 0.30],
        ];
    }

    #[DataProvider('referencias')]
    public function test_conserva_el_subtotal_de_validacion_y_redondea_el_cupon_en_el_borde(float $referencia, string $tipo, string $valor, float $descuento, float $total): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        Cupon::factory()->create(['tenant_id' => $tenant->id, 'codigo' => 'EXACTO', 'tipo' => $tipo, ($tipo === 'porcentaje' ? 'porcentaje' : 'monto') => $valor, 'activo' => true, 'fecha_inicio' => null, 'fecha_fin' => null]);
        $resultado = app(PricingService::class)->cotizar(new Carrito([], 'EXACTO', $referencia), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::parse('2026-11-14'), 1));
        $this->assertSame($referencia, $resultado->subtotal);
        $this->assertSame($descuento, $resultado->cupon->descuento);
        $this->assertSame($total, $resultado->total);
    }

    public static function referencias(): array
    {
        return [
            'porcentaje antes de redondear la referencia' => [1.005, 'porcentaje', '50', 0.50, 0.51],
            'resta antes de redondear la referencia' => [0.005, 'porcentaje', '100', 0.01, 0.00],
            'monto fijo acotado' => [0.005, 'monto_fijo', '1', 0.01, 0.00],
            'referencia cientifica pequena' => [0.0000001, 'porcentaje', '10', 0.0, 0.0],
            'referencia cientifica cero' => [0.0, 'monto_fijo', '1', 0.0, 0.0],
        ];
    }
}
