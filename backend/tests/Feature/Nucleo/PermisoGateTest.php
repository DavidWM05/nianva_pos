<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifica que las rutas de Produccion, Payroll y Prestamos esten protegidas
 * por permisos. Usa un usuario sin roles/permisos (solo autenticado) y
 * confirma 403 en una ruta de cada modulo -- si el middleware permiso:X
 * falta, la ruta devolveria 200/422 en vez de 403.
 */
class PermisoGateTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Sucursal $sucursal;
    private Usuario $usuario;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['nombre' => 'Test Permisos', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Principal']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Usuario Sin Permisos',
            'correo' => 'sinpermisos@test.com',
            'password' => 'password-valida-123',
        ]);
        app(TenantContext::class)->set($this->tenant);
    }

    public function test_produccion_rutas_requieren_permiso(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/insumos', [
            'nombre' => 'Test',
            'unidad_medida_id' => 1,
        ])->assertForbidden();
    }

    public function test_payroll_rutas_requieren_permiso(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/empleados', [
            'usuario_id' => $this->usuario->id,
            'sucursal_id' => $this->sucursal->id,
            'salario_base' => 8000,
        ])->assertForbidden();
    }

    public function test_prestamos_rutas_requieren_permiso(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/prestamos', [
            'monto' => 10000,
            'fecha_prestamo' => now()->toDateString(),
        ])->assertForbidden();
    }
}
