<?php

namespace Tests\Feature\CuentasPagar;

use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuentaPagarErrorCodeTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Compra $compra;

    private MetodoPago $metodoPago;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['nombre' => 'Test CxP HTTP', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Ana',
            'correo' => uniqid('cxp-http-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-cxp-'.uniqid(), 'es_sistema' => false]);
        $ids = collect(['cuentas_pagar.ver', 'cuentas_pagar.registrar_pago', 'cuentas_pagar.anular'])->map(function (string $nombre) {
            [$modulo, $accion] = explode('.', $nombre);

            return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
        });
        $rol->permisos()->attach($ids);
        $this->usuario->roles()->attach($rol->id);

        $proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'Distribuidora X']);
        $this->compra = Compra::create([
            'tenant_id' => $this->tenant->id,
            'proveedor_id' => $proveedor->id,
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'total' => 100,
        ]);
        $this->metodoPago = MetodoPago::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Transferencia',
            'tipo' => 'transferencia',
        ]);
    }

    public function test_pago_en_cuenta_pagada_devuelve_cuenta_pagar_ya_pagada(): void
    {
        $cuenta = $this->crearCuenta('pagada', 0);

        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/pagos", [
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPago->id,
        ])
            ->assertStatus(422)
            ->assertExactJson([
                'message' => "La cuenta por pagar {$cuenta->id} ya está pagada.",
                'error_code' => 'cuenta_pagar_ya_pagada',
            ]);
    }

    public function test_pago_en_cuenta_anulada_devuelve_cuenta_pagar_anulada(): void
    {
        $cuenta = $this->crearCuenta('anulada', 100);

        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/pagos", [
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPago->id,
        ])
            ->assertStatus(422)
            ->assertExactJson([
                'message' => "La cuenta por pagar {$cuenta->id} está anulada.",
                'error_code' => 'cuenta_pagar_anulada',
            ]);
    }

    public function test_anular_cuenta_con_pagos_devuelve_cuenta_pagar_con_abonos(): void
    {
        $cuenta = $this->crearCuenta('pendiente', 100);

        AbonoPagar::create([
            'cuenta_pagar_id' => $cuenta->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPago->id,
        ]);

        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/anular")
            ->assertStatus(422)
            ->assertExactJson([
                'message' => "La cuenta por pagar {$cuenta->id} tiene pagos registrados y no se puede anular.",
                'error_code' => 'cuenta_pagar_con_abonos',
            ]);
    }

    private function crearCuenta(string $estado, float $saldo): CuentaPagar
    {
        return CuentaPagar::create([
            'tenant_id' => $this->tenant->id,
            'compra_id' => $this->compra->id,
            'proveedor_id' => $this->compra->proveedor_id,
            'monto_total' => 100,
            'saldo_pendiente' => $saldo,
            'fecha_vencimiento' => now()->addDays(30)->toDateString(),
            'estado' => $estado,
        ]);
    }
}
