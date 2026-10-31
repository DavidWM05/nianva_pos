<?php

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Antes de CompraController, InventarioService::registrarCompra() no tenia
 * ninguna ruta HTTP -- este test cubre exactamente el flujo que estaba
 * roto: registrar una compra desde la API debe crear/actualizar
 * inventario_stock Y escribir kardex, en la misma llamada.
 */
class CompraControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario}
     */
    private function crearUsuarioConPermisos(array $permisos): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);

        $usuario = Usuario::create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana',
            'correo' => uniqid('ana-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        if ($permisos !== []) {
            $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-de-prueba-'.uniqid(), 'es_sistema' => false]);
            $ids = collect($permisos)->map(function (string $nombre) {
                [$modulo, $accion] = explode('.', $nombre);

                return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
            });
            $rol->permisos()->attach($ids);
            $usuario->roles()->attach($rol->id);
        }

        return compact('tenant', 'sucursal', 'usuario');
    }

    public function test_registrar_compra_crea_inventario_stock_y_kardex_para_cada_linea(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['compras.crear']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Playera Básica']);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'M']);

        $this->actingAs($usuario);

        $respuesta = $this->postJson('/api/v1/compras', [
            'proveedor_id' => $proveedor->id,
            'numero_comprobante' => 'F-001',
            'items' => [
                ['variante_id' => $variante->id, 'cantidad' => 20, 'precio_compra' => 50],
            ],
        ]);

        $respuesta->assertCreated();

        $this->assertDatabaseHas('inventario_stock', [
            'sucursal_id' => $sucursal->id,
            'variante_id' => $variante->id,
            'stock_actual' => 20,
        ]);
        $this->assertDatabaseHas('kardex', [
            'variante_id' => $variante->id,
            'sucursal_id' => $sucursal->id,
            'tipo' => 'entrada',
            'cantidad' => 20,
            'motivo' => 'compra',
            'stock_resultante' => 20,
        ]);
        $this->assertDatabaseHas('compras', [
            'proveedor_id' => $proveedor->id,
            'sucursal_id' => $sucursal->id,
            'numero_comprobante' => 'F-001',
            'total' => 1000,
        ]);

        // Una segunda compra de la misma variante debe SUMAR, no reemplazar.
        $this->postJson('/api/v1/compras', [
            'proveedor_id' => $proveedor->id,
            'items' => [
                ['variante_id' => $variante->id, 'cantidad' => 5, 'precio_compra' => 55],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('inventario_stock', [
            'sucursal_id' => $sucursal->id,
            'variante_id' => $variante->id,
            'stock_actual' => 25,
        ]);
        $this->assertDatabaseCount('kardex', 2);
    }

    public function test_registrar_compra_exige_permiso_compras_crear(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Gorra']);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'Unica']);

        $this->actingAs($usuario);

        $this->postJson('/api/v1/compras', [
            'proveedor_id' => $proveedor->id,
            'items' => [['variante_id' => $variante->id, 'cantidad' => 1, 'precio_compra' => 10]],
        ])->assertForbidden();
    }

    public function test_registrar_compra_valida_proveedor_e_items(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['compras.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/compras', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['proveedor_id', 'items']);
    }

    /**
     * El flujo completo que el usuario reporto roto: crear un producto,
     * darle una variante, crear un proveedor y registrar una compra --
     * TODO via los endpoints HTTP reales (nunca Model::create() directo),
     * para probar la cadena completa tal como la recorre el frontend, y
     * confirmar al final que el stock y el kardex lo reflejan.
     */
    public function test_flujo_completo_producto_variante_proveedor_y_compra_via_http(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos([
            'inventario.ver', 'inventario.crear', 'compras.crear',
        ]);
        $this->actingAs($usuario);

        $producto = $this->postJson('/api/v1/productos', ['nombre' => 'Playera Básica', 'precio_venta' => 199])
            ->assertCreated()
            ->json('data');

        $variante = $this->postJson("/api/v1/productos/{$producto['id']}/variantes", ['talla' => 'M', 'color' => 'Azul'])
            ->assertCreated()
            ->json('data');

        $proveedor = $this->postJson('/api/v1/proveedores', ['razon_social' => 'Textiles del Norte'])
            ->assertCreated()
            ->json('data');

        // Antes de la variante, el producto no tiene stock.
        $this->getJson("/api/v1/productos/{$producto['id']}")
            ->assertOk()
            ->assertJsonPath('data.variantes.0.stock', []);

        $this->postJson('/api/v1/compras', [
            'proveedor_id' => $proveedor['id'],
            'items' => [['variante_id' => $variante['id'], 'cantidad' => 30, 'precio_compra' => 45]],
        ])->assertCreated();

        // Stock por sucursal, vía el mismo endpoint que consume la pantalla de detalle.
        $this->getJson("/api/v1/productos/{$producto['id']}")
            ->assertOk()
            ->assertJsonPath('data.variantes.0.stock.0.sucursal_nombre', $sucursal->nombre)
            ->assertJsonPath('data.variantes.0.stock.0.stock_actual', 30);

        // Kardex, vía el mismo endpoint que consume la pestaña Kardex.
        $this->getJson("/api/v1/producto-variantes/{$variante['id']}/kardex")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tipo', 'entrada')
            ->assertJsonPath('data.0.motivo', 'compra')
            ->assertJsonPath('data.0.stock_resultante', 30);
    }
}
