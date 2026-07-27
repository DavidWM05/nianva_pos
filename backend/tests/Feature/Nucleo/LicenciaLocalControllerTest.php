<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LicenciaLocalControllerTest extends TestCase
{
    use RefreshDatabase;

    private function crearUsuario(): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => 'ana@test.com', 'password' => 'password-valida-123',
        ]);

        return compact('tenant', 'usuario');
    }

    public function test_expone_el_estado_de_la_licencia_del_tenant_del_usuario_autenticado(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuario();
        LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'saas',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'fecha_expiracion' => now()->addYear()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt',
            'ultima_validacion' => now(),
        ]);

        $this->actingAs($usuario);

        $this->getJson('/api/licencia-local')
            ->assertOk()
            ->assertJsonPath('data.estado', 'activa')
            ->assertJsonPath('data.tipo', 'saas')
            ->assertJsonPath('data.en_periodo_gracia', false);
    }

    public function test_marca_en_periodo_de_gracia_cuando_la_ultima_validacion_tiene_mas_de_un_dia(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuario();
        LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'saas',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt',
            'ultima_validacion' => now()->subDays(3),
        ]);

        $this->actingAs($usuario);

        $this->getJson('/api/licencia-local')
            ->assertOk()
            ->assertJsonPath('data.en_periodo_gracia', true)
            ->assertJsonPath('data.dias_desde_ultima_validacion', 3);
    }

    public function test_404_si_el_tenant_no_tiene_licencia_local(): void
    {
        ['usuario' => $usuario] = $this->crearUsuario();
        $this->actingAs($usuario);

        $this->getJson('/api/licencia-local')->assertNotFound();
    }

    public function test_exige_autenticacion(): void
    {
        $this->getJson('/api/licencia-local')->assertUnauthorized();
    }
}
