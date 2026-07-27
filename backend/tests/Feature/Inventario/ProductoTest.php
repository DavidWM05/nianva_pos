<?php

namespace Tests\Feature\Inventario;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductoTest extends TestCase
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

    public function test_lista_pagina_filtra_ordena_calcula_stock_total_y_reporta_permisos(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver', 'inventario.crear']);
        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Playeras']);

        $productoA = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Playera Basica']);
        $varianteA1 = ProductoVariante::create(['producto_id' => $productoA->id, 'talla' => 'M']);
        $varianteA2 = ProductoVariante::create(['producto_id' => $productoA->id, 'talla' => 'L']);
        InventarioStock::create(['sucursal_id' => $sucursal->id, 'variante_id' => $varianteA1->id, 'stock_actual' => 5]);
        InventarioStock::create(['sucursal_id' => $sucursal->id, 'variante_id' => $varianteA2->id, 'stock_actual' => 3]);

        $productoB = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Pantalon Cargo']);
        ProductoVariante::create(['producto_id' => $productoB->id, 'talla' => 'Unica']);
        // Sin fila de inventario_stock -- stock_total debe ser 0, no null.

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/productos?sort_field=nombre&sort_order=asc');

        $respuesta->assertOk();
        $respuesta->assertJsonPath('meta.total', 2);
        $respuesta->assertJsonPath('meta.permisos.crear', true);
        $respuesta->assertJsonPath('meta.permisos.editar', false);
        $respuesta->assertJsonPath('data.0.nombre', 'Pantalon Cargo');
        $respuesta->assertJsonPath('data.0.stock_total', 0);
        $respuesta->assertJsonPath('data.1.nombre', 'Playera Basica');
        $respuesta->assertJsonPath('data.1.stock_total', 8);
        $respuesta->assertJsonPath('data.1.categoria.nombre', 'Playeras');

        $filtrado = $this->getJson('/api/productos?filtro_nombre=playera');
        $filtrado->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nombre', 'Playera Basica');
    }

    public function test_index_exige_el_permiso_inventario_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/productos')->assertForbidden();
    }

    public function test_crear_producto_exige_permiso_y_valida_el_nombre(): void
    {
        ['usuario' => $sinPermiso] = $this->crearUsuarioConPermisos(['inventario.ver']);
        $this->actingAs($sinPermiso);
        $this->postJson('/api/productos', ['nombre' => 'Nuevo'])->assertForbidden();

        ['usuario' => $conPermiso] = $this->crearUsuarioConPermisos(['inventario.ver', 'inventario.crear']);
        $this->actingAs($conPermiso);

        $this->postJson('/api/productos', [])->assertUnprocessable()->assertJsonValidationErrors('nombre');

        $this->postJson('/api/productos', ['nombre' => 'Sudadera Gris', 'precio_venta' => 450])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Sudadera Gris')
            ->assertJsonPath('data.activo', true);
    }

    public function test_actualizar_y_desactivar_producto_nunca_borra_fisicamente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.editar', 'inventario.eliminar']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Chamarra']);

        $this->actingAs($usuario);

        $this->putJson("/api/productos/{$producto->id}", ['nombre' => 'Chamarra Impermeable'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Chamarra Impermeable');

        $this->patchJson("/api/productos/{$producto->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->assertDatabaseHas('productos', ['id' => $producto->id, 'activo' => false]);
    }

    public function test_show_incluye_las_variantes_con_su_stock_por_sucursal(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Gorra']);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'Unica', 'color' => 'Negro']);
        InventarioStock::create(['sucursal_id' => $sucursal->id, 'variante_id' => $variante->id, 'stock_actual' => 12, 'stock_minimo' => 2]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson("/api/productos/{$producto->id}");

        $respuesta->assertOk();
        $respuesta->assertJsonPath('data.variantes.0.color', 'Negro');
        $respuesta->assertJsonPath('data.variantes.0.stock.0.sucursal_nombre', 'Centro');
        $respuesta->assertJsonPath('data.variantes.0.stock.0.stock_actual', 12);
        $respuesta->assertJsonPath('data.variantes.0.stock_actual', 12);
    }

    /**
     * stock_actual (a diferencia de `stock`, que lista todas las sucursales)
     * es el numero resuelto para la sucursal del usuario que pide el
     * recurso -- lo unico que necesita LineasProductoComponent (TPV/
     * Apartados) para validar en vivo, ver el reporte del bug de stock.
     */
    public function test_show_resuelve_stock_actual_para_la_sucursal_del_usuario_no_para_otras(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver']);
        $otraSucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Norte']);

        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Bufanda']);
        $conStock = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'Unica']);
        InventarioStock::create(['sucursal_id' => $sucursal->id, 'variante_id' => $conStock->id, 'stock_actual' => 7]);
        InventarioStock::create(['sucursal_id' => $otraSucursal->id, 'variante_id' => $conStock->id, 'stock_actual' => 99]);

        $sinFila = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'Chica']);
        // Sin ninguna fila de inventario_stock -- stock_actual debe ser 0, no null.

        $this->actingAs($usuario);

        $respuesta = $this->getJson("/api/productos/{$producto->id}");

        $respuesta->assertOk();
        $respuesta->assertJsonPath('data.variantes.0.stock_actual', 7);
        $respuesta->assertJsonPath('data.variantes.1.stock_actual', 0);
    }

    public function test_variantes_se_crean_editan_y_desactivan_anidadas_bajo_el_producto(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear', 'inventario.editar', 'inventario.eliminar']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Tenis']);

        $this->actingAs($usuario);

        $creada = $this->postJson("/api/productos/{$producto->id}/variantes", [
            'talla' => '27', 'color' => 'Blanco', 'codigo_barras' => 'ABC123',
        ]);
        $creada->assertCreated()->assertJsonPath('data.talla', '27');
        $varianteId = $creada->json('data.id');

        $this->putJson("/api/producto-variantes/{$varianteId}", ['talla' => '28', 'color' => 'Blanco'])
            ->assertOk()
            ->assertJsonPath('data.talla', '28');

        $this->patchJson("/api/producto-variantes/{$varianteId}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
    }

    /**
     * ConfiguracionTenant::actual()->codigo_barras_automatico -- si esta
     * activo y el payload no trae codigo_barras, ProductoVarianteController
     * genera uno el mismo (12 digitos, unico) en vez de dejarlo vacio.
     */
    public function test_store_variante_genera_codigo_de_barras_si_la_configuracion_lo_pide_y_no_llega_uno(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        ConfiguracionTenant::where('tenant_id', $tenant->id)->update(['codigo_barras_automatico' => true]);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Gorra']);

        $this->actingAs($usuario);

        $respuesta = $this->postJson("/api/productos/{$producto->id}/variantes", ['talla' => 'Unica']);

        $respuesta->assertCreated();
        $codigo = $respuesta->json('data.codigo_barras');
        $this->assertNotNull($codigo);
        $this->assertMatchesRegularExpression('/^\d{12}$/', $codigo);
    }

    public function test_store_variante_respeta_el_codigo_manual_aunque_la_configuracion_este_activa(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        ConfiguracionTenant::where('tenant_id', $tenant->id)->update(['codigo_barras_automatico' => true]);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Gorra']);

        $this->actingAs($usuario);

        $respuesta = $this->postJson("/api/productos/{$producto->id}/variantes", [
            'talla' => 'Unica', 'codigo_barras' => 'MANUAL-1',
        ]);

        $respuesta->assertCreated()->assertJsonPath('data.codigo_barras', 'MANUAL-1');
    }

    public function test_store_variante_no_genera_codigo_si_la_configuracion_esta_apagada(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Gorra']);

        $this->actingAs($usuario);

        $respuesta = $this->postJson("/api/productos/{$producto->id}/variantes", ['talla' => 'Unica']);

        $respuesta->assertCreated()->assertJsonPath('data.codigo_barras', null);
    }

    public function test_kardex_devuelve_los_movimientos_de_la_variante_mas_recientes_primero(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Bufanda']);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'Unica']);

        $servicio = app(InventarioService::class);
        $servicio->registrarMovimiento($variante->id, $sucursal->id, 'entrada', 10, 'compra', $usuario->id);
        $servicio->registrarMovimiento($variante->id, $sucursal->id, 'salida', 3, 'venta', $usuario->id);

        $this->actingAs($usuario);

        $respuesta = $this->getJson("/api/producto-variantes/{$variante->id}/kardex");

        $respuesta->assertOk();
        $respuesta->assertJsonCount(2, 'data');
        $respuesta->assertJsonPath('data.0.tipo', 'salida');
        $respuesta->assertJsonPath('data.0.stock_resultante', 7);
        $respuesta->assertJsonPath('data.1.tipo', 'entrada');
        $respuesta->assertJsonPath('data.1.stock_resultante', 10);
    }
}
