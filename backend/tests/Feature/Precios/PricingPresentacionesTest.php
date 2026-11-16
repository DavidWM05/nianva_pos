<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioItem;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class PricingPresentacionesTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    #[DataProvider('precios')]
    public function test_resuelve_presentacion_propia_o_precio_unitario_por_factor(?string $propio, bool $lista, bool $regla, float $esperado): void
    {
        $d = $this->negocio04b();
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '6.000', 'precio_venta' => $propio]);
        $l = ListaPrecio::factory()->create(['tenant_id' => $d['tenant']->id]);
        ListaPrecioItem::factory()->create(['tenant_id' => $d['tenant']->id, 'lista_precio_id' => $l->id, 'producto_id' => $d['producto']->id, 'precio' => '80.00']);
        if ($regla) {
            ReglaPrecio::factory()->create(['tenant_id' => $d['tenant']->id, 'porcentaje' => '10.0000']);
        }
        $r = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($d['variante']->id, 2, $p->id)]), new ContextoPrecio($d['tenant']->id, $d['sucursal']->id, $d['cliente']->id, CarbonImmutable::now(), $lista ? $l->id : null));
        $this->assertSame($esperado, $r->total);
        $this->assertSame($p->id, $r->lineas[0]->presentacionId);
        $this->assertSame('6.000', $r->lineas[0]->factor);
        $this->assertSame($lista && $propio === null ? $l->id : null, $r->lineas[0]->listaAplicada);
    }

    public static function precios(): array
    {
        return [[null, false, false, 1200.0], ['50.00', false, false, 100.0], [null, true, false, 960.0], ['50.00', true, false, 100.0], ['50.00', false, true, 90.0], ['0.00', true, false, 0.0]];
    }

    #[DataProvider('redondeos')]
    public function test_precio_heredado_fraccionario_redondea_por_linea_y_no_antes(bool $regla, float $esperado): void
    {
        $d = $this->negocio04b();
        $d['producto']->update(['precio_venta' => '1.01']);
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '0.500', 'precio_venta' => null]);
        if ($regla) {
            ReglaPrecio::factory()->create(['tenant_id' => $d['tenant']->id, 'porcentaje' => '10.0000']);
        }
        $r = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($d['variante']->id, 3, $p->id)]), new ContextoPrecio($d['tenant']->id, $d['sucursal']->id, $d['cliente']->id, CarbonImmutable::now()));
        $this->assertSame($esperado, $r->total);
        $this->assertSame(0.505, $r->lineas[0]->precioBase);
    }

    public static function redondeos(): array
    {
        return [[false, 1.52], [true, 1.37]];
    }
}
