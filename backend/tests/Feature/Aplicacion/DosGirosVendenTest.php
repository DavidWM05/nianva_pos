<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Bloqueos04e;
use Tests\TestCase;

/**
 * ARQ-07: dos tenants con perfiles de giro distintos (ropa/calzado y abarrotes) dan de alta sus
 * productos con lo que siembra su perfil y venden, sin una sola linea de codigo por giro.
 */
class DosGirosVendenTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISOS = ['configuracion.editar', 'inventario.ver', 'inventario.crear', 'inventario.editar', 'ventas.crear'];

    /** @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario} */
    private function tenantConPerfil(string $perfil): array
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach (self::PERMISOS as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);

        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => $perfil])->assertOk();

        return ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario];
    }

    /** Alta del producto y de su variante por la API; devuelve el id de la variante. */
    private function altaProducto(string $nombre, string $categoria, array $variante): int
    {
        $productoId = $this->postJson('/api/v1/productos', [
            'nombre' => $nombre,
            'categoria_id' => Categoria::query()->where('nombre', $categoria)->firstOrFail()->id,
            'precio_compra' => 40,
            'precio_venta' => 100,
        ])->assertCreated()->json('data.id');

        return (int) $this->postJson("/api/v1/productos/{$productoId}/variantes", $variante)->assertCreated()->json('data.id');
    }

    /** Stock, caja abierta y la venta por la API. */
    private function vender(array $ctx, int $varianteId): void
    {
        $proveedor = Proveedor::factory()->create(['tenant_id' => $ctx['tenant']->id]);
        $datos = ['tenant_id' => $ctx['tenant']->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id];
        $items = [['variante_id' => $varianteId, 'cantidad' => 5, 'precio_compra' => 40]];
        app(InventarioService::class)->registrarCompraConStocks($datos, $items, Bloqueos04e::stocks($ctx['sucursal']->id, [$varianteId]));
        app(CajaService::class)->abrirCajaConSucursal(Bloqueos04e::sucursal($ctx['sucursal']->id), $ctx['usuario']->id, 500);
        $efectivo = MetodoPago::factory()->create(['tenant_id' => $ctx['tenant']->id, 'tipo' => 'efectivo']);
        $cliente = Cliente::query()->where('nombre', 'Publico General')->firstOrFail();

        $this->postJson('/api/v1/ventas', [
            'cliente_id' => $cliente->ulid,
            'items' => [['variante_id' => $varianteId, 'cantidad' => 2]],
            'pagos' => [['metodo_pago_id' => $efectivo->id, 'monto' => 200]],
        ])->assertCreated()->assertJsonPath('data.total', '200.00');
    }

    public function test_ropa_y_abarrotes_dan_de_alta_y_venden_cada_uno_con_su_perfil(): void
    {
        $ropa = $this->tenantConPerfil('ropa-calzado');
        $talla = Atributo::query()->where('nombre', 'Talla')->firstOrFail()->valores()->where('valor', 'M')->firstOrFail();
        $color = Atributo::query()->where('nombre', 'Color')->firstOrFail()->valores()->where('valor', 'Negro')->firstOrFail();
        $playera = $this->altaProducto('Playera', 'Ropa', ['valores' => [$talla->id, $color->id]]);
        $this->assertSame('M / Negro', ProductoVariante::query()->with('valoresAtributo.valor.atributo')->findOrFail($playera)->nombreDeAtributos());
        $this->getJson('/api/v1/productos?filtro_nombre=Negro')->assertOk()->assertJsonPath('data.0.nombre', 'Playera');
        $this->vender($ropa, $playera);

        $abarrotes = $this->tenantConPerfil('abarrotes');
        $this->assertSame(0, Atributo::query()->count());
        $frijol = $this->altaProducto('Frijol a granel', 'Granel', []);
        $this->vender($abarrotes, $frijol);

        app(TenantContext::class)->set($ropa['tenant']);
        $this->assertSame(['Color', 'Talla'], Atributo::query()->orderBy('nombre')->pluck('nombre')->all());
    }
}
