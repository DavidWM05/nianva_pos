<?php

namespace Tests\Feature\Auditoria;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class OperacionesSensiblesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([
            'ventas.anular',
            'apartados.cancelar',
            'inventario.editar',
            'caja.cerrar',
            'usuarios.editar',
            'roles.editar',
        ]);
        $this->usuario->refresh();
    }

    private function auditoria(string $tabla, int $id): int
    {
        return Auditoria::sinTenant()
            ->where('tabla_afectada', $tabla)
            ->where('registro_id', $id)
            ->where('accion', 'update')
            ->count();
    }

    public function test_operaciones_exitosas_dejan_auditoria_y_la_fallida_no(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario)
            ->patchJson("/api/v1/ventas/{$venta->id}/anular", ['motivo' => 'prueba'])
            ->assertOk();
        $this->assertGreaterThan(0, $this->auditoria('ventas', $venta->id));

        $anulada = Venta::factory()->anulada()->create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
        ]);
        $antes = $this->auditoria('ventas', $anulada->id);
        $this->actingAs($this->usuario)
            ->patchJson("/api/v1/ventas/{$anulada->id}/anular", ['motivo' => 'otra'])
            ->assertUnprocessable();
        $this->assertSame($antes, $this->auditoria('ventas', $anulada->id));

        $apartado = $this->crearApartado();
        $this->actingAs($this->usuario)
            ->patchJson("/api/v1/apartados/{$apartado->id}/cancelar", ['motivo' => 'prueba'])
            ->assertOk();
        $this->assertGreaterThan(0, $this->auditoria('apartados', $apartado->id));

        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->actingAs($this->usuario)
            ->putJson("/api/v1/productos/{$producto->id}", [
                'nombre' => $producto->nombre,
                'precio_venta' => 333,
            ])->assertOk();
        $this->assertGreaterThan(0, $this->auditoria('productos', $producto->id));

        $this->actingAs($this->usuario)
            ->patchJson("/api/v1/caja/{$this->caja->id}/cerrar", ['monto_fisico' => 0])
            ->assertOk();
        $this->assertGreaterThan(0, $this->auditoria('caja_sesiones', $this->caja->id));

        $objetivo = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Objetivo',
            'correo' => 'objetivo-'.uniqid().'@test.com',
            'password' => 'password-valida-123',
        ]);
        $objetivo->forceFill(['two_factor_secret' => 'secret', 'two_factor_confirmed_at' => now()])->save();
        $this->actingAs($this->usuario)
            ->postJson("/api/v1/usuarios/{$objetivo->id}/desactivar-2fa")
            ->assertOk();
        $this->assertGreaterThan(0, $this->auditoria('usuarios', $objetivo->id));
    }

    public function test_cambiar_permisos_de_rol_deja_una_fila_con_agregados_y_quitados(): void
    {
        $permisoA = Permiso::firstOrCreate(['nombre' => 'clientes.ver'], ['modulo' => 'clientes', 'accion' => 'ver']);
        $permisoB = Permiso::firstOrCreate(['nombre' => 'clientes.crear'], ['modulo' => 'clientes', 'accion' => 'crear']);
        $rol = Rol::create(['tenant_id' => $this->tenant->id, 'nombre' => 'rol-audit', 'es_sistema' => false]);
        $rol->permisos()->attach($permisoA->id);

        $this->actingAs($this->usuario)
            ->putJson("/api/v1/roles/{$rol->id}", [
                'nombre' => 'rol-audit',
                'permisos' => [$permisoB->id],
            ])->assertOk();

        $fila = Auditoria::sinTenant()
            ->where('tabla_afectada', 'roles')
            ->where('registro_id', $rol->id)
            ->where('accion', 'update')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame([$permisoA->id], $fila->cambios['permisos']['antes'] ?? null);
        $this->assertSame([$permisoB->id], $fila->cambios['permisos']['despues'] ?? null);
    }

    public function test_cambiar_roles_de_usuario_deja_una_fila(): void
    {
        $rol = Rol::create(['tenant_id' => $this->tenant->id, 'nombre' => 'rol-usuario', 'es_sistema' => false]);
        $objetivo = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Objetivo',
            'correo' => 'objetivo-'.uniqid().'@test.com',
            'password' => 'password-valida-123',
        ]);

        $this->actingAs($this->usuario)
            ->putJson("/api/v1/usuarios/{$objetivo->id}", [
                'nombre' => 'Objetivo',
                'correo' => $objetivo->correo,
                'roles' => [$rol->id],
            ])->assertOk();

        $fila = Auditoria::sinTenant()
            ->where('tabla_afectada', 'usuarios')
            ->where('registro_id', $objetivo->id)
            ->where('accion', 'update')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame([], $fila->cambios['roles']['antes'] ?? null);
        $this->assertSame([$rol->id], $fila->cambios['roles']['despues'] ?? null);
    }

    public function test_sync_sin_cambios_no_deja_fila(): void
    {
        $rol = Rol::create(['tenant_id' => $this->tenant->id, 'nombre' => 'rol-sin-cambio', 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(['nombre' => 'clientes.ver'], ['modulo' => 'clientes', 'accion' => 'ver']);
        $rol->permisos()->attach($permiso->id);
        $antes = $this->auditoria('roles', $rol->id);

        $this->actingAs($this->usuario)
            ->putJson("/api/v1/roles/{$rol->id}", [
                'nombre' => 'rol-sin-cambio',
                'permisos' => [$permiso->id],
            ])->assertOk();

        $this->assertSame($antes, $this->auditoria('roles', $rol->id));
    }

    public function test_variante_editada_deja_auditoria(): void
    {
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'talla' => 'M']);

        $this->actingAs($this->usuario)
            ->putJson("/api/v1/producto-variantes/{$variante->id}", ['talla' => 'L'])
            ->assertOk();

        $this->assertGreaterThan(0, $this->auditoria('producto_variantes', $variante->id));
    }
}
