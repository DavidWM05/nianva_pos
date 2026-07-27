<?php

namespace Tests\Feature\Precios;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReglaPrecioTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, usuario: Usuario}
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

    private function datosBase(array $overrides = []): array
    {
        return array_merge([
            'nombre' => 'Regla de prueba',
            'tipo' => 'porcentaje',
            'valor' => 10,
            'aplica_a' => 'todo',
        ], $overrides);
    }

    public function test_index_exige_el_permiso_reglas_precio_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/reglas-precio')->assertForbidden();
    }

    public function test_lista_incluye_el_nombre_de_la_entidad_especifica_no_solo_el_nivel(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.ver']);
        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Playeras']);
        ReglaPrecio::create([
            'tenant_id' => $tenant->id, 'nombre' => 'Descuento playeras', 'tipo' => 'porcentaje',
            'valor' => 15, 'aplica_a' => 'categoria', 'categoria_id' => $categoria->id, 'activo' => true,
        ]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/reglas-precio');

        $respuesta->assertOk();
        $respuesta->assertJsonPath('data.0.aplica_a', 'categoria');
        $respuesta->assertJsonPath('data.0.categoria.nombre', 'Playeras');
    }

    public function test_show_exige_el_permiso_reglas_precio_ver_y_devuelve_la_regla_con_permisos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.ver']);
        $regla = ReglaPrecio::create([
            'tenant_id' => $tenant->id, 'nombre' => 'Regla puntual', 'tipo' => 'porcentaje',
            'valor' => 12, 'aplica_a' => 'todo', 'activo' => true,
        ]);

        $this->actingAs($usuario);

        $this->getJson("/api/reglas-precio/{$regla->id}")
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Regla puntual')
            ->assertJsonPath('meta.permisos.editar', false);
    }

    public function test_show_sin_el_permiso_reglas_precio_ver_devuelve_403(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $regla = ReglaPrecio::create([
            'tenant_id' => $tenant->id, 'nombre' => 'Regla puntual', 'tipo' => 'porcentaje',
            'valor' => 12, 'aplica_a' => 'todo', 'activo' => true,
        ]);

        $this->actingAs($usuario);

        $this->getJson("/api/reglas-precio/{$regla->id}")->assertForbidden();
    }

    public function test_crear_regla_porcentaje_exige_valor(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/reglas-precio', $this->datosBase(['tipo' => 'porcentaje', 'valor' => null]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('valor');
    }

    public function test_crear_regla_nxm_exige_cantidad_compra_y_cantidad_paga(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/reglas-precio', $this->datosBase(['tipo' => 'nxm', 'valor' => null]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cantidad_compra', 'cantidad_paga']);

        $this->postJson('/api/reglas-precio', $this->datosBase([
            'tipo' => 'nxm', 'valor' => null, 'cantidad_compra' => 3, 'cantidad_paga' => 2,
        ]))->assertCreated()->assertJsonPath('data.cantidad_compra', 3);
    }

    public function test_crear_regla_bundle_exige_cantidad_compra_y_precio_bundle(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/reglas-precio', $this->datosBase(['tipo' => 'bundle', 'valor' => null]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cantidad_compra', 'precio_bundle']);
    }

    public function test_aplica_a_producto_exige_producto_id(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/reglas-precio', $this->datosBase(['aplica_a' => 'producto']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('producto_id');
    }

    public function test_editar_regla_cambia_de_tipo_y_limpia_los_campos_del_tipo_anterior(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.crear', 'reglas_precio.editar']);
        $this->actingAs($usuario);

        $regla = ReglaPrecio::create([
            'tenant_id' => $tenant->id, 'nombre' => 'Combo playeras', 'tipo' => 'nxm',
            'cantidad_compra' => 3, 'cantidad_paga' => 2, 'aplica_a' => 'todo', 'activo' => true,
        ]);

        $this->putJson("/api/reglas-precio/{$regla->id}", $this->datosBase(['tipo' => 'porcentaje', 'valor' => 20]))
            ->assertOk()
            ->assertJsonPath('data.valor', '20.00')
            ->assertJsonPath('data.cantidad_compra', null)
            ->assertJsonPath('data.cantidad_paga', null);
    }

    public function test_desactivar_regla_nunca_borra_fisicamente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.eliminar']);
        $regla = ReglaPrecio::create([
            'tenant_id' => $tenant->id, 'nombre' => 'Regla X', 'tipo' => 'porcentaje',
            'valor' => 5, 'aplica_a' => 'todo', 'activo' => true,
        ]);

        $this->actingAs($usuario);

        $this->patchJson("/api/reglas-precio/{$regla->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->assertDatabaseHas('reglas_precio', ['id' => $regla->id, 'activo' => false]);
    }

    public function test_variante_de_aplica_a_incluye_el_nombre_del_producto_padre(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['reglas_precio.ver']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'nombre' => 'Gorra']);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'Unica']);
        ReglaPrecio::create([
            'tenant_id' => $tenant->id, 'nombre' => 'Descuento gorra', 'tipo' => 'monto_fijo',
            'valor' => 20, 'aplica_a' => 'variante', 'variante_id' => $variante->id, 'activo' => true,
        ]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/reglas-precio');

        $respuesta->assertOk()->assertJsonPath('data.0.variante.producto_nombre', 'Gorra');
    }
}
