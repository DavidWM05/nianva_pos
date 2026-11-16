<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Exceptions\ListaPrecioNoDisponibleException;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use App\Modules\Precios\Models\ListaPrecioItem;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PricingListasTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('listas')]
    public function test_resuelve_lista_explicita_cliente_variante_producto_y_fallback(bool $explicita, bool $asignada, ?string $precioProducto, ?string $precioVariante, float $esperado, bool $aplicada, bool $promocion): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => '100.00']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'precio_venta' => '150.00']);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $lista = ListaPrecio::factory()->create(['tenant_id' => $tenant->id]);
        $listaCliente = ListaPrecio::factory()->create(['tenant_id' => $tenant->id]);
        ListaPrecioItem::factory()->create(['tenant_id' => $tenant->id, 'lista_precio_id' => $listaCliente->id, 'producto_id' => $producto->id, 'precio' => '95.00']);
        if ($asignada) {
            ListaPrecioCliente::factory()->create(['tenant_id' => $tenant->id, 'lista_precio_id' => $listaCliente->id, 'cliente_id' => $cliente->id]);
        }
        if ($precioProducto !== null) {
            ListaPrecioItem::factory()->create(['tenant_id' => $tenant->id, 'lista_precio_id' => $lista->id, 'producto_id' => $producto->id, 'precio' => $precioProducto]);
        }
        if ($precioVariante !== null) {
            ListaPrecioItem::factory()->create(['tenant_id' => $tenant->id, 'lista_precio_id' => $lista->id, 'producto_id' => null, 'variante_id' => $variante->id, 'precio' => $precioVariante]);
        }
        if ($promocion) {
            ReglaPrecio::factory()->create(['tenant_id' => $tenant->id, 'porcentaje' => 10]);
        }
        $otro = Tenant::factory()->create();
        app(TenantContext::class)->set($otro);
        $resultado = app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, $cliente->id, CarbonImmutable::now(), $explicita ? $lista->id : null));
        $this->assertSame($esperado, $resultado->total);
        $this->assertSame($aplicada ? ($explicita ? $lista->id : $listaCliente->id) : null, $resultado->lineas[0]->listaAplicada);
    }

    public static function listas(): array
    {
        return [
            'ninguna' => [false, false, null, null, 150.0, false, false],
            'producto de explícita' => [true, false, '90.00', null, 90.0, true, false],
            'variante gana a producto' => [true, false, '90.00', '80.00', 80.0, true, false],
            'lista de cliente' => [false, true, null, null, 95.0, true, false],
            'explícita vence cliente' => [true, true, '90.00', null, 90.0, true, false],
            'sin item hereda precio resuelto' => [true, true, null, null, 150.0, false, false],
            'reglas después de lista' => [true, false, '90.00', '80.00', 72.0, true, true],
        ];
    }

    public function test_rechaza_una_lista_explicita_inexistente(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $this->expectException(ListaPrecioNoDisponibleException::class);
        app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now(), 987));
    }

    public function test_seg01_rechaza_lista_de_otro_tenant_aunque_el_ambiente_sea_suyo(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $otro = Tenant::factory()->create();
        $lista = ListaPrecio::factory()->create(['tenant_id' => $otro->id]);
        app(TenantContext::class)->set($otro);
        $this->expectException(ListaPrecioNoDisponibleException::class);
        app(PricingService::class)->cotizar(new Carrito([new LineaCarrito($variante->id, 1)]), new ContextoPrecio($tenant->id, null, null, CarbonImmutable::now(), $lista->id));
    }

    #[DataProvider('referenciasInvalidas')]
    public function test_el_item_exige_exactamente_un_producto_o_una_variante(bool $ambos): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $this->expectException(InvalidArgumentException::class);
        ListaPrecioItem::factory()->create(['tenant_id' => $tenant->id, 'producto_id' => $ambos ? $producto->id : null, 'variante_id' => $ambos ? $variante->id : null]);
    }

    public static function referenciasInvalidas(): array
    {
        return [[true], [false]];
    }
}
