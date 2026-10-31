<?php

namespace Tests\Feature\CuentasPagar;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuentasPagarReporteTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Proveedor $proveedor;

    private Compra $compra;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['nombre' => 'Test Reporte CxP', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Admin',
            'correo' => 'admin-cxp-reporte@test.com',
            'password' => 'secret123',
        ]);
        $this->proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'Distribuidora X']);

        app(TenantContext::class)->set($this->tenant);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'admin-test', 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'reportes_cuentas_pagar.ver'],
            ['modulo' => 'reportes_cuentas_pagar', 'accion' => 'ver'],
        );
        $rol->permisos()->attach($permiso->id);
        $this->usuario->roles()->attach($rol->id);

        $this->compra = Compra::create([
            'tenant_id' => $this->tenant->id,
            'proveedor_id' => $this->proveedor->id,
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'total' => 0,
        ]);
    }

    private function crearCuentaPagar(float $monto, string $fechaVencimiento): CuentaPagar
    {
        return CuentaPagar::create([
            'tenant_id' => $this->tenant->id,
            'compra_id' => $this->compra->id,
            'proveedor_id' => $this->proveedor->id,
            'monto_total' => $monto,
            'saldo_pendiente' => $monto,
            'fecha_vencimiento' => $fechaVencimiento,
            'estado' => 'pendiente',
        ]);
    }

    public function test_reporte_clasifica_cuenta_vencida_en_bucket_correcto(): void
    {
        $this->crearCuentaPagar(3000, now()->subDays(45)->toDateString());

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/cuentas-pagar/reporte?limite=10');

        $response->assertOk();

        $data = $response->json('data');

        $this->assertEquals(3000.0, $data['total_pendiente']);
        $this->assertEquals(3000.0, $data['total_vencido']);
        $this->assertEquals(0.0, $data['por_antiguedad']['al_dia']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_1_30']);
        $this->assertEquals(3000.0, $data['por_antiguedad']['vencido_31_60']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_61_90']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_90_mas']);
    }

    public function test_reporte_clasifica_cuenta_por_vencer_en_al_dia(): void
    {
        $this->crearCuentaPagar(1500, now()->addDays(20)->toDateString());

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/cuentas-pagar/reporte?limite=10');

        $response->assertOk();

        $data = $response->json('data');

        $this->assertEquals(1500.0, $data['total_pendiente']);
        $this->assertEquals(0.0, $data['total_vencido']);
        $this->assertEquals(1500.0, $data['por_antiguedad']['al_dia']);
    }

    public function test_reporte_muestra_proveedor_top(): void
    {
        $this->crearCuentaPagar(5000, now()->subDays(10)->toDateString());

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/cuentas-pagar/reporte');

        $response->assertOk();

        $porProveedor = $response->json('data.por_proveedor');

        $this->assertCount(1, $porProveedor);
        $this->assertSame($this->proveedor->id, $porProveedor[0]['proveedor_id']);
        $this->assertSame('Distribuidora X', $porProveedor[0]['proveedor_nombre']);
        $this->assertEquals(5000.0, $porProveedor[0]['saldo_pendiente']);
        $this->assertSame(1, $porProveedor[0]['cuentas_pendientes']);
    }
}
