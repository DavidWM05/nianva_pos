<?php

namespace Tests\Feature\Datos;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\Venta;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * DAT-10: un registro con documentos o movimientos se desactiva, no se elimina; el borrado
 * fisico solo procede sin dependencias y la respuesta lo explica; los registros protegidos
 * (Publico General, ultimo admin) se bloquean en la Action. Un caso por entidad.
 */
class NoSeBorraLoQueTieneHistoriaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Usuario con un rol propio (no admin: el admin exige 2FA) y los permisos dados.
     *
     * @param  list<string>  $permisos
     */
    private function actorCon(array $permisos): Usuario
    {
        $usuario = Usuario::factory()->create();
        app(TenantContext::class)->set(Tenant::query()->findOrFail($usuario->tenant_id));

        $rol = Rol::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $rol->permisos()->attach(collect($permisos)->map(function (string $nombre) {
            [$modulo, $accion] = explode('.', $nombre);

            return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
        }));
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario->refresh());

        return $usuario;
    }

    private function adminDe(Usuario $actor, bool $activo = true): Usuario
    {
        return Usuario::factory()->admin()->create([
            'tenant_id' => $actor->tenant_id,
            'sucursal_id' => $actor->sucursal_id,
            'activo' => $activo,
        ]);
    }

    // --- Usuario -----------------------------------------------------------------------

    public function test_usuario_con_ventas_se_desactiva_y_no_tiene_borrado_fisico(): void
    {
        $actor = $this->actorCon(['usuarios.eliminar']);
        $vendedor = Usuario::factory()->create(['tenant_id' => $actor->tenant_id, 'sucursal_id' => $actor->sucursal_id]);
        Venta::factory()->create(['tenant_id' => $actor->tenant_id, 'sucursal_id' => $actor->sucursal_id, 'usuario_id' => $vendedor->id]);

        $this->patchJson("/api/v1/usuarios/{$vendedor->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
        $this->deleteJson("/api/v1/usuarios/{$vendedor->id}")->assertStatus(405);
        $this->assertDatabaseHas('usuarios', ['id' => $vendedor->id, 'activo' => false, 'deleted_at' => null]);
    }

    public function test_desactivarse_a_si_mismo_responde_403_con_su_error_code(): void
    {
        $actor = $this->actorCon(['usuarios.eliminar']);

        $this->patchJson("/api/v1/usuarios/{$actor->id}/desactivar")
            ->assertForbidden()
            ->assertJsonPath('error_code', 'desactivar_propio_usuario')
            ->assertJsonPath('message', 'No puedes desactivar tu propio usuario.');
        $this->assertDatabaseHas('usuarios', ['id' => $actor->id, 'activo' => true]);
    }

    public function test_no_se_puede_desactivar_al_ultimo_admin_activo_del_tenant(): void
    {
        $actor = $this->actorCon(['usuarios.eliminar']);
        $admin = $this->adminDe($actor);

        $this->patchJson("/api/v1/usuarios/{$admin->id}/desactivar")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'ultimo_admin')
            ->assertJsonPath('usuario_id', $admin->id);
        $this->assertDatabaseHas('usuarios', ['id' => $admin->id, 'activo' => true]);
    }

    public function test_no_se_le_puede_quitar_el_rol_admin_al_ultimo_admin_activo(): void
    {
        $actor = $this->actorCon(['usuarios.editar']);
        $admin = $this->adminDe($actor);
        $otroRol = Rol::factory()->create(['tenant_id' => $actor->tenant_id]);

        $this->putJson("/api/v1/usuarios/{$admin->id}", [
            'nombre' => $admin->nombre,
            'correo' => $admin->correo,
            'roles' => [$otroRol->id],
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'ultimo_admin');
        $this->assertTrue($admin->refresh()->tieneRol('admin'));
    }

    public function test_editar_al_ultimo_admin_sin_quitarle_el_rol_si_procede(): void
    {
        $actor = $this->actorCon(['usuarios.editar']);
        $admin = $this->adminDe($actor);
        $rolAdmin = Rol::query()->whereNull('tenant_id')->where('nombre', 'admin')->firstOrFail();

        $this->putJson("/api/v1/usuarios/{$admin->id}", ['nombre' => 'Otro nombre', 'correo' => $admin->correo, 'roles' => [$rolAdmin->id]])
            ->assertOk();
        $this->putJson("/api/v1/usuarios/{$admin->id}", ['nombre' => 'Sin roles en el cuerpo', 'correo' => $admin->correo])
            ->assertOk();
    }

    public function test_con_otro_admin_activo_si_se_puede_desactivar_un_admin(): void
    {
        $actor = $this->actorCon(['usuarios.eliminar']);
        $admin = $this->adminDe($actor);
        $this->adminDe($actor);

        $this->patchJson("/api/v1/usuarios/{$admin->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
    }

    public function test_un_admin_inactivo_o_de_otro_tenant_no_cuenta_como_otro_admin(): void
    {
        $actor = $this->actorCon(['usuarios.eliminar']);
        $admin = $this->adminDe($actor);
        $this->adminDe($actor, activo: false);
        Usuario::factory()->admin()->create(['tenant_id' => Tenant::factory()->create()->id]);

        $this->patchJson("/api/v1/usuarios/{$admin->id}/desactivar")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'ultimo_admin');
    }

    // --- Rol ---------------------------------------------------------------------------

    public function test_rol_con_usuarios_no_se_borra_y_responde_tiene_movimientos(): void
    {
        $actor = $this->actorCon(['roles.eliminar']);
        $rol = Rol::factory()->create(['tenant_id' => $actor->tenant_id]);
        $rol->usuarios()->attach(Usuario::factory()->create(['tenant_id' => $actor->tenant_id])->id);

        $this->deleteJson("/api/v1/roles/{$rol->id}")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'tiene_movimientos')
            ->assertJsonPath('message', 'No puedes eliminar un rol con usuarios asignados. Quita el rol de esos usuarios primero.')
            ->assertJsonPath('entidad', 'rol')
            ->assertJsonPath('id', $rol->id);
        $this->assertDatabaseHas('roles', ['id' => $rol->id]);
    }

    public function test_rol_sin_usuarios_se_borra_fisicamente(): void
    {
        $actor = $this->actorCon(['roles.eliminar']);
        $rol = Rol::factory()->create(['tenant_id' => $actor->tenant_id]);

        $this->deleteJson("/api/v1/roles/{$rol->id}")->assertOk();
        $this->assertDatabaseMissing('roles', ['id' => $rol->id]);
    }

    // --- Unidad de medida --------------------------------------------------------------

    public function test_unidad_en_uso_no_se_borra_y_responde_su_error_code(): void
    {
        $actor = $this->actorCon(['inventario.eliminar']);
        $unidad = UnidadMedida::factory()->create(['tenant_id' => $actor->tenant_id]);
        ProductoVariante::factory()->create([
            'producto_id' => Producto::factory()->create(['tenant_id' => $actor->tenant_id])->id,
            'unidad_medida_id' => $unidad->id,
        ]);

        $this->deleteJson("/api/v1/unidades-medida/{$unidad->id}")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'unidad_en_uso');
        $this->assertDatabaseHas('unidades_medida', ['id' => $unidad->id]);
    }

    public function test_unidad_sin_uso_se_borra_fisicamente(): void
    {
        $actor = $this->actorCon(['inventario.eliminar']);
        $unidad = UnidadMedida::factory()->create(['tenant_id' => $actor->tenant_id]);

        $this->deleteJson("/api/v1/unidades-medida/{$unidad->id}")->assertOk();
        $this->assertDatabaseMissing('unidades_medida', ['id' => $unidad->id]);
    }

    // --- Cliente -----------------------------------------------------------------------

    public function test_publico_general_no_se_desactiva_y_responde_su_error_code(): void
    {
        $actor = $this->actorCon(['clientes.eliminar']);
        $publicoGeneral = Cliente::query()->where('tenant_id', $actor->tenant_id)->where('es_sistema', true)->firstOrFail();

        $this->patchJson("/api/v1/clientes/{$publicoGeneral->id}/desactivar")
            ->assertForbidden()
            ->assertJsonPath('error_code', 'cliente_sistema')
            ->assertJsonPath('message', 'Este es un cliente de sistema y no se puede modificar.');
        $this->assertDatabaseHas('clientes', ['id' => $publicoGeneral->id, 'activo' => true]);
    }

    public function test_cliente_con_ventas_se_desactiva_y_no_tiene_borrado_fisico(): void
    {
        $actor = $this->actorCon(['clientes.eliminar']);
        $cliente = Cliente::factory()->create(['tenant_id' => $actor->tenant_id]);
        Venta::factory()->create(['tenant_id' => $actor->tenant_id, 'cliente_id' => $cliente->id]);

        $this->patchJson("/api/v1/clientes/{$cliente->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
        $this->deleteJson("/api/v1/clientes/{$cliente->id}")->assertStatus(405);
        $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'activo' => false]);
    }

    // --- Producto y variante -----------------------------------------------------------

    public function test_producto_con_movimientos_se_desactiva_y_no_tiene_borrado_fisico(): void
    {
        $actor = $this->actorCon(['inventario.eliminar']);
        $kardex = Kardex::factory()->create(['sucursal_id' => $actor->sucursal_id]);
        $variante = ProductoVariante::query()->findOrFail($kardex->variante_id);

        $this->patchJson("/api/v1/productos/{$variante->producto_id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
        $this->deleteJson("/api/v1/productos/{$variante->producto_id}")->assertStatus(405);
        $this->assertDatabaseHas('productos', ['id' => $variante->producto_id, 'activo' => false]);
    }

    public function test_variante_con_movimientos_se_desactiva_y_no_tiene_borrado_fisico(): void
    {
        $actor = $this->actorCon(['inventario.eliminar']);
        $kardex = Kardex::factory()->create(['sucursal_id' => $actor->sucursal_id]);

        $this->patchJson("/api/v1/producto-variantes/{$kardex->variante_id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
        $this->deleteJson("/api/v1/producto-variantes/{$kardex->variante_id}")->assertStatus(405);
        $this->assertDatabaseHas('producto_variantes', ['id' => $kardex->variante_id, 'activo' => false]);
    }

    // --- Proveedor ---------------------------------------------------------------------

    public function test_proveedor_con_compras_se_desactiva_y_sale_del_catalogo(): void
    {
        $actor = $this->actorCon(['inventario.eliminar', 'inventario.ver']);
        $proveedor = Proveedor::factory()->create(['tenant_id' => $actor->tenant_id]);
        Compra::factory()->create(['tenant_id' => $actor->tenant_id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $actor->sucursal_id]);

        $this->patchJson("/api/v1/proveedores/{$proveedor->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.id', $proveedor->id)
            ->assertJsonPath('data.activo', false);
        $this->assertDatabaseHas('proveedores', ['id' => $proveedor->id, 'activo' => false]);
        $this->assertNotContains($proveedor->id, collect($this->getJson('/api/v1/proveedores')->json('data'))->pluck('id'));
    }

    public function test_desactivar_proveedor_exige_permiso_y_respeta_el_tenant(): void
    {
        $actor = $this->actorCon(['inventario.ver']);
        $proveedor = Proveedor::factory()->create(['tenant_id' => $actor->tenant_id]);
        $ajeno = Proveedor::factory()->create(['tenant_id' => Tenant::factory()->create()->id]);

        $this->patchJson("/api/v1/proveedores/{$proveedor->id}/desactivar")->assertForbidden();

        $this->actorCon(['inventario.eliminar']);
        $this->patchJson("/api/v1/proveedores/{$ajeno->id}/desactivar")->assertNotFound();
        $this->assertDatabaseHas('proveedores', ['id' => $ajeno->id, 'activo' => true]);
    }
}
