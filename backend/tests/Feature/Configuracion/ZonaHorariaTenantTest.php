<?php

namespace Tests\Feature\Configuracion;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZonaHorariaTenantTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{tenant: Tenant, usuario: Usuario}
     */
    private function prepararConfiguracion(): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana',
            'correo' => uniqid('zona-horaria-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($tenant);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-zona-'.uniqid(), 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'configuracion.editar'],
            ['modulo' => 'configuracion', 'accion' => 'editar'],
        );
        $rol->permisos()->attach($permiso->id);
        $usuario->roles()->attach($rol->id);

        return compact('tenant', 'usuario');
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'moneda' => '$',
            'mostrar_rfc' => true,
            'mostrar_telefono' => true,
            'mostrar_correo' => true,
            'backup_auto' => false,
            'backup_frecuencia' => 'semanal',
            'codigo_barras_automatico' => false,
        ], $overrides);
    }

    public function test_get_trae_la_zona_horaria_por_defecto(): void
    {
        ['usuario' => $usuario] = $this->prepararConfiguracion();
        $this->actingAs($usuario);

        $this->getJson('/api/v1/configuracion')
            ->assertOk()
            ->assertJsonPath('data.zona_horaria', 'America/Mexico_City');
    }

    public function test_put_guarda_la_zona_horaria(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->prepararConfiguracion();
        $this->actingAs($usuario);

        $this->putJson('/api/v1/configuracion', $this->payload(['zona_horaria' => 'America/Bogota']))
            ->assertOk()
            ->assertJsonPath('data.zona_horaria', 'America/Bogota');

        $this->assertSame(
            'America/Bogota',
            ConfiguracionTenant::where('tenant_id', $tenant->id)->firstOrFail()->zona_horaria,
        );
    }

    public function test_put_rechaza_una_zona_horaria_invalida(): void
    {
        ['usuario' => $usuario] = $this->prepararConfiguracion();
        $this->actingAs($usuario);

        $this->putJson('/api/v1/configuracion', $this->payload(['zona_horaria' => 'Marte/Olympus']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('zona_horaria');
    }

    public function test_put_sin_zona_horaria_no_la_cambia(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->prepararConfiguracion();
        $this->actingAs($usuario);

        $this->putJson('/api/v1/configuracion', $this->payload(['zona_horaria' => 'America/Bogota']))
            ->assertOk();

        $this->putJson('/api/v1/configuracion', $this->payload(['moneda' => 'USD']))
            ->assertOk()
            ->assertJsonPath('data.zona_horaria', 'America/Bogota');

        $this->assertSame(
            'America/Bogota',
            ConfiguracionTenant::where('tenant_id', $tenant->id)->firstOrFail()->zona_horaria,
        );
    }
}
