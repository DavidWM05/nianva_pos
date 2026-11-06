<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;

trait PreparaArq04b
{
    private function negocio04b(bool $cajaAbierta = true, int $stockInicial = 10): array
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $metodo = MetodoPago::factory()->create(['tenant_id' => $tenant->id]);
        $proveedor = Proveedor::factory()->create(['tenant_id' => $tenant->id]);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => 100]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $stock = InventarioStock::factory()->create(['sucursal_id' => $sucursal->id, 'variante_id' => $variante->id, 'stock_actual' => $stockInicial]);
        $caja = CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'monto_apertura' => 50, 'estado' => $cajaAbierta ? 'abierta' : 'cerrada']);

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'metodo', 'proveedor', 'producto', 'variante', 'stock', 'caja');
    }
}
