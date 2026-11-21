<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use App\Modules\Precios\Models\ListaPrecioItem;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ListasPrecioApiTest extends TestCase
{
    use RefreshDatabase;

    private function actor(array $permisos = ['listas_precio.ver', 'listas_precio.crear', 'listas_precio.editar', 'listas_precio.eliminar']): Usuario
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach ($permisos as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::factory()->create(compact('nombre', 'modulo', 'accion')));
        }
        $usuario->roles()->attach($rol);
        $this->actingAs($usuario);

        return $usuario;
    }

    public function test_crud_pagina_filtra_y_audita_listas_con_nombre_unico_por_tenant(): void
    {
        $usuario = $this->actor();
        $respuesta = $this->postJson('/api/v1/precios/listas', ['nombre' => 'Mayoreo']);
        $respuesta->assertCreated()->assertJsonPath('data.activo', true);
        $id = $respuesta->json('data.id');
        $this->postJson('/api/v1/precios/listas', ['nombre' => 'Mayoreo'])->assertUnprocessable()->assertJsonValidationErrors('nombre');
        ListaPrecio::factory()->create(['tenant_id' => Tenant::factory()->create()->id, 'nombre' => 'Mayoreo']);
        $this->getJson('/api/v1/precios/listas?q=Mayor&rows=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 1)->assertJsonPath('meta.permisos.crear', true);
        $this->putJson('/api/v1/precios/listas/'.$id, ['nombre' => 'Preferente'])->assertOk()->assertJsonPath('data.nombre', 'Preferente');
        $this->getJson('/api/v1/precios/listas/'.$id)->assertOk()->assertJsonPath('data.nombre', 'Preferente');
        $this->patchJson('/api/v1/precios/listas/'.$id.'/desactivar')->assertOk()->assertJsonPath('data.activo', false);
        $this->assertDatabaseHas('auditoria', ['tenant_id' => $usuario->tenant_id, 'tabla_afectada' => 'listas_precio', 'registro_id' => $id]);
    }

    public function test_los_items_validan_exclusividad_unicidad_y_dinero_d2(): void
    {
        $usuario = $this->actor();
        $lista = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $producto = Producto::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $ruta = '/api/v1/precios/listas/'.$lista->id.'/items';
        $this->postJson($ruta, ['precio' => 10])->assertUnprocessable();
        $this->postJson($ruta, ['producto_id' => $producto->id, 'variante_id' => $variante->id, 'precio' => 10])->assertUnprocessable();
        $respuesta = $this->postJson($ruta, ['producto_id' => $producto->id, 'precio' => '10.50']);
        $respuesta->assertCreated()->assertJsonPath('data.precio', '10.50');
        $id = $respuesta->json('data.id');
        $this->postJson($ruta, ['producto_id' => $producto->id, 'precio' => 9])->assertUnprocessable();
        $this->putJson($ruta.'/'.$id, ['producto_id' => $producto->id, 'precio' => '12.35'])->assertOk()->assertJsonPath('data.precio', '12.35');
        $this->getJson('/api/v1/precios/listas/'.$lista->id)->assertOk()->assertJsonPath('data.items.0.precio', '12.35');
        $this->deleteJson($ruta.'/'.$id)->assertNoContent();
    }

    public function test_no_modifica_un_item_desde_otra_lista_del_mismo_tenant(): void
    {
        $usuario = $this->actor();
        $a = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $b = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $producto = Producto::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $item = ListaPrecioItem::factory()->create(['tenant_id' => $usuario->tenant_id, 'lista_precio_id' => $a->id, 'producto_id' => $producto->id, 'precio' => '10.00']);
        $ruta = '/api/v1/precios/listas/'.$b->id.'/items/'.$item->id;
        $this->putJson($ruta, ['producto_id' => $producto->id, 'precio' => '20.00'])->assertNotFound();
        $this->deleteJson($ruta)->assertNotFound();
        $this->assertSame('10.00', $item->refresh()->getAttribute('precio'));
    }

    public function test_elegir_lista_expone_solo_listas_activas_del_tenant_sin_exigir_permiso_de_catalogo(): void
    {
        $usuario = $this->actor(['precios.elegir_lista']);
        $lista = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id, 'activo' => false]);
        ListaPrecio::factory()->create(['tenant_id' => Tenant::factory()->create()->id]);
        $this->getJson('/api/v1/precios/listas/disponibles')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $lista->id);
        $this->getJson('/api/v1/precios/listas/'.$lista->id)->assertForbidden();
    }

    public function test_un_cliente_tiene_una_lista_y_se_puede_reasignar_o_quitar(): void
    {
        $usuario = $this->actor();
        $cliente = Cliente::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $a = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $b = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $this->postJson('/api/v1/precios/listas/'.$a->id.'/clientes', ['cliente_id' => $cliente->ulid])->assertCreated();
        $respuesta = $this->postJson('/api/v1/precios/listas/'.$b->id.'/clientes', ['cliente_id' => $cliente->ulid]);
        $respuesta->assertCreated();
        $this->assertDatabaseCount('lista_precio_clientes', 1);
        $this->getJson('/api/v1/precios/listas/'.$b->id)->assertOk()->assertJsonPath('data.clientes.0.cliente_id', $cliente->ulid);
        $this->deleteJson('/api/v1/precios/listas/'.$a->id.'/clientes/'.$respuesta->json('data.id'))->assertNotFound();
        $this->deleteJson('/api/v1/precios/listas/'.$b->id.'/clientes/'.$respuesta->json('data.id'))->assertNoContent();
    }

    public function test_seg01_no_lee_listas_ajenas_ni_asigna_productos_o_clientes_ajenos(): void
    {
        $usuario = $this->actor();
        $lista = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $otro = Tenant::factory()->create();
        $ajena = ListaPrecio::factory()->create(['tenant_id' => $otro->id]);
        $producto = Producto::factory()->create(['tenant_id' => $otro->id]);
        $cliente = Cliente::factory()->create(['tenant_id' => $otro->id]);
        $this->getJson('/api/v1/precios/listas/'.$ajena->id)->assertNotFound();
        $this->postJson('/api/v1/precios/listas/'.$lista->id.'/items', ['producto_id' => $producto->id, 'precio' => 10])->assertUnprocessable()->assertJsonValidationErrors('producto_id');
        $this->postJson('/api/v1/precios/listas/'.$lista->id.'/clientes', ['cliente_id' => $cliente->ulid])->assertUnprocessable()->assertJsonValidationErrors('cliente_id');
    }

    #[DataProvider('selecciones')]
    public function test_seleccionar_lista_exige_permiso_solo_si_es_distinta_de_la_asignada(bool $permiso, bool $misma, int $status): void
    {
        $usuario = $this->actor($permiso ? ['ventas.crear', 'precios.elegir_lista'] : ['ventas.crear']);
        $cliente = Cliente::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $producto = Producto::factory()->create(['tenant_id' => $usuario->tenant_id, 'precio_venta' => 100]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $lista = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        ListaPrecioItem::factory()->create(['tenant_id' => $usuario->tenant_id, 'lista_precio_id' => $lista->id, 'producto_id' => $producto->id, 'precio' => 80]);
        if ($misma) {
            ListaPrecioCliente::factory()->create(['tenant_id' => $usuario->tenant_id, 'lista_precio_id' => $lista->id, 'cliente_id' => $cliente->id]);
        }
        $r = $this->postJson('/api/v1/ventas/cotizar', ['cliente_id' => $cliente->ulid, 'lista_precio_id' => $lista->id, 'items' => [['variante_id' => $variante->id, 'cantidad' => 1]]]);
        $r->assertStatus($status);
        if ($status === 200) {
            $r->assertJsonPath('data.subtotal', '80.00');
        }
    }

    public static function selecciones(): array
    {
        return [[false, false, 403], [false, true, 200], [true, false, 200]];
    }

    public function test_seg01_la_lista_explicita_ajena_es_rechazada_por_el_request(): void
    {
        $usuario = $this->actor(['ventas.crear', 'precios.elegir_lista']);
        $producto = Producto::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $lista = ListaPrecio::factory()->create(['tenant_id' => Tenant::factory()->create()->id]);
        $this->postJson('/api/v1/ventas/cotizar', ['lista_precio_id' => $lista->id, 'items' => [['variante_id' => $variante->id, 'cantidad' => 1]]])->assertUnprocessable()->assertJsonValidationErrors('lista_precio_id');
    }

    public function test_venta_apartado_y_cotizacion_pasan_la_lista_al_contexto(): void
    {
        $usuario = $this->actor(['ventas.crear', 'apartados.crear', 'cotizaciones.crear', 'precios.elegir_lista']);
        $cliente = Cliente::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $producto = Producto::factory()->create(['tenant_id' => $usuario->tenant_id, 'precio_venta' => 100]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        InventarioStock::factory()->create(['sucursal_id' => $usuario->sucursal_id, 'variante_id' => $variante->id, 'stock_actual' => 10]);
        CajaSesion::factory()->create(['sucursal_id' => $usuario->sucursal_id, 'usuario_id' => $usuario->id]);
        $metodo = MetodoPago::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $lista = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        ListaPrecioItem::factory()->create(['tenant_id' => $usuario->tenant_id, 'lista_precio_id' => $lista->id, 'producto_id' => $producto->id, 'precio' => 80]);
        $datos = ['cliente_id' => $cliente->ulid, 'lista_precio_id' => $lista->id, 'items' => [['variante_id' => $variante->id, 'cantidad' => 1]]];
        $this->postJson('/api/v1/ventas', $datos + ['pagos' => [['metodo_pago_id' => $metodo->id, 'monto' => 80]]])->assertCreated()->assertJsonPath('data.total', '80.00');
        $this->postJson('/api/v1/apartados', $datos)->assertCreated()->assertJsonPath('data.total', '80.00');
        $this->postJson('/api/v1/cotizaciones', $datos)->assertCreated()->assertJsonPath('data.total', '80.00');
    }

    #[DataProvider('operacionesConservadas')]
    public function test_liquidar_o_convertir_conserva_la_lista_elegida(string $operacion): void
    {
        $usuario = $this->actor(['apartados.crear', 'apartados.abonar', 'cotizaciones.crear', 'cotizaciones.convertir', 'precios.elegir_lista']);
        $cliente = Cliente::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $producto = Producto::factory()->create(['tenant_id' => $usuario->tenant_id, 'precio_venta' => 100]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        InventarioStock::factory()->create(['sucursal_id' => $usuario->sucursal_id, 'variante_id' => $variante->id, 'stock_actual' => 10]);
        CajaSesion::factory()->create(['sucursal_id' => $usuario->sucursal_id, 'usuario_id' => $usuario->id]);
        $metodo = MetodoPago::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $lista = ListaPrecio::factory()->create(['tenant_id' => $usuario->tenant_id]);
        ListaPrecioItem::factory()->create(['tenant_id' => $usuario->tenant_id, 'lista_precio_id' => $lista->id, 'producto_id' => $producto->id, 'precio' => 80]);
        $r = $this->postJson('/api/v1/'.$operacion, ['cliente_id' => $cliente->ulid, 'lista_precio_id' => $lista->id, 'items' => [['variante_id' => $variante->id, 'cantidad' => 1]]]);
        $r->assertCreated();
        $id = $r->json('data.id');
        $venta = $operacion === 'apartados'
            ? $this->postJson('/api/v1/apartados/'.$id.'/abonos', ['monto' => 80, 'pagos' => [['metodo_pago_id' => $metodo->id, 'monto' => 80]]])
            : $this->postJson('/api/v1/cotizaciones/'.$id.'/convertir', ['metodo_pago_id' => $metodo->id]);
        $venta->assertSuccessful();
        if ($operacion === 'apartados') {
            $this->patchJson('/api/v1/apartados/'.$id.'/liquidar')->assertSuccessful();
        }
        $this->assertDatabaseHas('ventas', ['cliente_id' => $cliente->id, 'total' => 80]);
    }

    public static function operacionesConservadas(): array
    {
        return [['apartados'], ['cotizaciones']];
    }
}
