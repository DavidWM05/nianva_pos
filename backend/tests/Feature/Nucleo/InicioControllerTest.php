<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InicioControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente}
     */
    private function crearUsuarioConPermisos(array $permisos): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => uniqid('ana-').'@test.com', 'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($tenant);

        if ($permisos !== []) {
            $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-de-prueba-'.uniqid(), 'es_sistema' => false]);
            $ids = collect($permisos)->map(function (string $nombre) {
                [$modulo, $accion] = explode('.', $nombre);

                return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
            });
            $rol->permisos()->attach($ids);
            $usuario->roles()->attach($rol->id);
        }

        $cliente = Cliente::where('tenant_id', $tenant->id)->firstOrFail();

        return compact('tenant', 'sucursal', 'usuario', 'cliente');
    }

    public function test_resumen_exige_el_permiso_reportes_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/inicio/resumen')->assertForbidden();
    }

    public function test_resumen_suma_solo_las_ventas_de_hoy_de_la_sucursal_del_usuario(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario, 'cliente' => $cliente] = $this->crearUsuarioConPermisos(['reportes.ver']);

        $cajaSesion = CajaSesion::create([
            'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id,
            'monto_apertura' => 0, 'fecha_apertura' => now(),
        ]);

        Venta::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id, 'total' => 150.00,
        ]);
        Venta::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id, 'total' => 100.00, 'estado' => 'anulada',
        ]);
        Venta::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id, 'total' => 300.00, 'es_venta_sombra' => true,
        ]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/inicio/resumen');

        $respuesta->assertOk()
            ->assertJsonPath('data.ventas_hoy.cantidad', 1)
            ->assertJsonPath('data.ventas_hoy.total', 150);
    }

    public function test_resumen_incluye_apartados_activos_por_vencer_en_los_proximos_7_dias(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario, 'cliente' => $cliente] = $this->crearUsuarioConPermisos(['reportes.ver']);

        Apartado::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'cliente_id' => $cliente->id,
            'usuario_id' => $usuario->id, 'total' => 200, 'estado' => 'activo',
            'fecha_vencimiento' => today()->addDays(3),
        ]);
        Apartado::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'cliente_id' => $cliente->id,
            'usuario_id' => $usuario->id, 'total' => 500, 'estado' => 'activo',
            'fecha_vencimiento' => today()->addDays(30),
        ]);
        Apartado::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'cliente_id' => $cliente->id,
            'usuario_id' => $usuario->id, 'total' => 80, 'estado' => 'cancelado',
            'fecha_vencimiento' => today()->addDays(1),
        ]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/inicio/resumen');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data.apartados_por_vencer')
            ->assertJsonPath('data.apartados_por_vencer.0.total', '200.00');
    }
}
