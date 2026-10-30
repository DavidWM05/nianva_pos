<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManejadorExcepcionNegocioTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['nombre' => 'Test Manejador', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Ana',
            'correo' => uniqid('manejador-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($this->tenant);
    }

    public function test_una_excepcion_con_contexto_responde_el_sobre_completo(): void
    {
        $this->darPermiso('gastos.crear');
        $this->actingAs($this->usuario);

        $this->postJson('/api/gastos', ['descripcion' => 'Luz', 'monto' => 80])
            ->assertStatus(422)
            ->assertExactJson([
                'message' => "No hay una caja abierta para la sucursal {$this->sucursal->id}.",
                'error_code' => 'caja_no_abierta',
                'sucursal_id' => $this->sucursal->id,
            ]);
    }

    public function test_modulo_no_activo_responde_403_con_el_cuerpo_exacto(): void
    {
        ConfiguracionTenant::updateOrCreate(
            ['tenant_id' => $this->tenant->id],
            ['modulos_activos' => []],
        );
        $this->darPermiso('cuentas_pagar.ver');
        $this->actingAs($this->usuario);

        $this->getJson('/api/cuentas-pagar')
            ->assertStatus(403)
            ->assertExactJson([
                'message' => "El módulo 'cxp' no está activo para este tenant.",
                'error_code' => 'modulo_no_activo',
            ]);
    }

    private function darPermiso(string $nombre): void
    {
        [$modulo, $accion] = explode('.', $nombre);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-'.uniqid(), 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion]);
        $rol->permisos()->attach($permiso->id);
        $this->usuario->roles()->attach($rol->id);
    }
}
