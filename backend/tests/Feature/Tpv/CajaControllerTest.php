<?php

namespace Tests\Feature\Tpv;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
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
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CajaControllerTest extends TestCase
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

        return compact('tenant', 'sucursal', 'usuario');
    }

    public function test_actual_devuelve_null_si_no_hay_caja_abierta(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.ver']);
        $this->actingAs($usuario);

        $this->getJson('/api/caja/actual')->assertOk()->assertJsonPath('data', null);
    }

    public function test_abrir_crea_sesion_y_actual_la_refleja(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.ver', 'caja.abrir']);
        $this->actingAs($usuario);

        $this->postJson('/api/caja/abrir', ['monto_apertura' => 500])
            ->assertCreated()
            ->assertJsonPath('data.estado', 'abierta')
            ->assertJsonPath('data.monto_apertura', '500.00');

        $this->getJson('/api/caja/actual')->assertOk()->assertJsonPath('data.estado', 'abierta');
    }

    public function test_actual_incluye_el_resumen_en_vivo_de_ventas_de_la_sesion(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.ver', 'caja.abrir', 'ventas.crear']);
        $sesion = app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);

        $efectivo = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Ropa']);
        $producto = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Playera', 'precio_compra' => 50, 'precio_venta' => 100]);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'M']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);
        app(InventarioService::class)->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [['variante_id' => $variante->id, 'cantidad' => 5, 'precio_compra' => 50]],
        );
        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        app(VentaService::class)->registrarVenta(
            ['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id],
            [['variante_id' => $variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $efectivo->id, 'monto' => 100]],
        );

        $this->actingAs($usuario);

        $this->getJson('/api/caja/actual')->assertOk()
            ->assertJsonPath('meta.resumen.ventas_count', 1)
            ->assertJsonPath('meta.resumen.total_ventas', 100);
    }

    public function test_abrir_con_caja_ya_abierta_devuelve_422_con_error_code_caja_ya_abierta(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir']);
        app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        $this->actingAs($usuario);

        $this->postJson('/api/caja/abrir', ['monto_apertura' => 300])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'caja_ya_abierta');
    }

    public function test_abrir_sin_permiso_devuelve_403(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->postJson('/api/caja/abrir', ['monto_apertura' => 500])->assertForbidden();
    }

    public function test_cerrar_calcula_diferencia_y_marca_cerrada(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir', 'caja.cerrar']);
        $sesion = app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        $this->actingAs($usuario);

        $respuesta = $this->patchJson("/api/caja/{$sesion->id}/cerrar", ['monto_fisico' => 480]);

        $respuesta->assertOk()
            ->assertJsonPath('data.estado', 'cerrada')
            ->assertJsonPath('data.diferencia', '-20.00');
    }

    public function test_actual_incluye_total_gastos_en_el_resumen_en_vivo(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.ver', 'caja.abrir']);
        $sesion = app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        app(GastoService::class)->registrarGasto($sucursal->id, $usuario->id, 'Luz', 80);

        $this->actingAs($usuario);

        $this->getJson('/api/caja/actual')->assertOk()
            ->assertJsonPath('meta.resumen.total_gastos', 80)
            ->assertJsonPath('meta.permisos.gastos_ver', false)
            ->assertJsonPath('meta.permisos.gastos_crear', false);

        $this->assertNotNull($sesion);
    }

    public function test_cerrar_descuenta_los_gastos_reales_calculados_por_el_backend(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir', 'caja.cerrar']);
        $sesion = app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        app(GastoService::class)->registrarGasto($sucursal->id, $usuario->id, 'Luz', 80);
        $this->actingAs($usuario);

        // total_teorico = apertura(500) + ventas(0) - gastos(80) = 420.
        $respuesta = $this->patchJson("/api/caja/{$sesion->id}/cerrar", ['monto_fisico' => 420]);

        $respuesta->assertOk()->assertJsonPath('data.diferencia', '0.00');
    }
}
