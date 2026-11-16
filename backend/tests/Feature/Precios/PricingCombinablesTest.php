<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Exceptions\CuponNoCombinableException;
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

class PricingCombinablesTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('reglas')]
    public function test_ordena_y_combina_sobre_el_importe_restante(array $datos, float $cantidad, float $total, array $indices, array $descuentos): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $categoria = Categoria::factory()->create(['tenant_id' => $tenant->id]);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'precio_venta' => '100.00']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $reglas = [];
        foreach ($datos as $dato) {
            $nivel = $dato['aplica_a'] ?? 'variante';
            $reglas[] = ReglaPrecio::factory()->create(array_merge([
                'tenant_id' => $tenant->id, 'aplica_a' => $nivel,
                'variante_id' => $nivel === 'variante' ? $variante->id : null,
                'producto_id' => $nivel === 'producto' ? $producto->id : null,
                'categoria_id' => $nivel === 'categoria' ? $categoria->id : null,
            ], $dato));
        }
        $resultado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, $cantidad)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame($total, $resultado->total);
        $this->assertSame(array_map(fn (int $indice) => $reglas[$indice]->id, $indices), array_map(fn ($regla) => $regla->id, $resultado->lineas[0]->reglas));
        $this->assertSame($descuentos, array_map(fn ($regla) => $regla->descuento, $resultado->lineas[0]->reglas));
    }

    public static function reglas(): array
    {
        $primera = ['tipo' => 'porcentaje', 'porcentaje' => '10.0000', 'prioridad' => 5, 'combinable' => true];
        $segunda = ['tipo' => 'porcentaje', 'porcentaje' => '20.0000', 'prioridad' => 1, 'combinable' => true];

        return [
            'dos combinables' => [[$primera, $segunda], 1, 72.0, [0, 1], [10.0, 18.0]],
            'primera no combinable' => [[array_replace($primera, ['combinable' => false]), $segunda], 1, 90.0, [0], [10.0]],
            'omite siguiente no combinable y sigue' => [[$primera, array_replace($segunda, ['prioridad' => 4, 'combinable' => false]), array_replace($segunda, ['prioridad' => 3, 'porcentaje' => 30])], 1, 63.0, [0, 2], [10.0, 27.0]],
            'prioridad vence nivel' => [[array_replace($primera, ['prioridad' => 0, 'combinable' => false]), array_replace($segunda, ['aplica_a' => 'todo', 'prioridad' => 10, 'porcentaje' => 50, 'combinable' => false])], 1, 50.0, [1], [50.0]],
            'nivel vence id con prioridad igual' => [[array_replace($primera, ['prioridad' => 0, 'combinable' => false]), array_replace($segunda, ['aplica_a' => 'producto', 'prioridad' => 0, 'combinable' => false])], 1, 90.0, [0], [10.0]],
            'id desempata' => [[array_replace($primera, ['prioridad' => 0, 'combinable' => false]), array_replace($segunda, ['prioridad' => 0, 'combinable' => false])], 1, 80.0, [1], [20.0]],
            'cantidad decimal' => [[$primera, $segunda], 1.5, 108.0, [0, 1], [15.0, 27.0]],
            'nxm sobre el precio descontado' => [[$primera, ['tipo' => 'nxm', 'cantidad_compra' => 3, 'cantidad_paga' => 2, 'prioridad' => 1, 'combinable' => true]], 3, 180.0, [0, 1], [30.0, 90.0]],
            'bundle sobre el precio descontado' => [[$primera, ['tipo' => 'bundle', 'cantidad_compra' => 3, 'precio_bundle' => 250, 'prioridad' => 1, 'combinable' => true]], 7, 590.0, [0, 1], [70.0, 40.0]],
        ];
    }

    #[DataProvider('cupones')]
    public function test_el_cupon_respeta_la_configuracion_y_solo_se_reparte_entre_lineas_elegibles(bool $combina, float $descuento, float $total, array $impuestos): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        ConfiguracionTenant::sinTenant()->where('tenant_id', $tenant->id)->update(['cupon_combinable_con_promociones' => $combina]);
        $lineas = [];
        foreach ([0, 1] as $indice) {
            $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '100.00']);
            $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
            $lineas[] = new LineaCarrito($variante->id, 1);
            if ($indice === 0) {
                ReglaPrecio::factory()->create(['tenant_id' => $tenant->id, 'aplica_a' => 'variante', 'variante_id' => $variante->id, 'porcentaje' => 10]);
            }
        }
        Cupon::factory()->create(['tenant_id' => $tenant->id, 'codigo' => 'PROMO', 'porcentaje' => 10]);
        $otro = Tenant::factory()->create();
        app(TenantContext::class)->set($otro);
        $resultado = app(PricingService::class)->cotizar(new Carrito($lineas, 'PROMO'), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
        $this->assertSame($descuento, $resultado->cupon->descuento);
        $this->assertSame($total, $resultado->total);
        $this->assertSame($impuestos, array_map(fn ($linea) => $linea->impuesto, $resultado->lineas));
    }

    public static function cupones(): array
    {
        return ['encendida' => [true, 19.0, 171.0, [11.17, 12.41]], 'apagada' => [false, 10.0, 180.0, [12.41, 12.41]]];
    }

    public function test_rechaza_el_cupon_con_error_propio_si_todas_las_lineas_tienen_promocion(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        ConfiguracionTenant::sinTenant()->where('tenant_id', $tenant->id)->update(['cupon_combinable_con_promociones' => false]);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        ReglaPrecio::factory()->create(['tenant_id' => $tenant->id]);
        Cupon::factory()->create(['tenant_id' => $tenant->id, 'codigo' => 'PROMO']);
        try {
            app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)], 'PROMO'), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now()));
            $this->fail('Debe rechazar un cupón sin líneas elegibles.');
        } catch (CuponNoCombinableException $excepcion) {
            $this->assertSame('cupon_no_combinable', $excepcion->errorCode());
            $this->assertSame(['codigo' => 'PROMO'], $excepcion->contexto());
        }
    }
}
