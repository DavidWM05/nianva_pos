<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RevalidarLicenciasCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'licencias.producto_slug' => 'nucleo-pos-ropa',
            'licencias.servidor_url' => 'https://licencias.test',
        ]);
    }

    private function crearLicencia(string $nombreTenant): LicenciaLocal
    {
        $tenant = Tenant::create(['nombre' => $nombreTenant, 'pais' => 'MX', 'activo' => true]);

        return LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'saas',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt-anterior',
            'ultima_validacion' => now()->subDay(),
        ]);
    }

    public function test_revalida_todos_los_tenants_con_licencia_local_existente(): void
    {
        $licenciaA = $this->crearLicencia('Tenant A');
        $licenciaB = $this->crearLicencia('Tenant B');

        Http::fake([
            'https://licencias.test/api/validar-licencia' => Http::response(['estado' => 'activa'], 200),
        ]);

        $this->artisan('licencia:revalidar')->assertExitCode(0);

        Http::assertSentCount(2);
        $this->assertTrue($licenciaA->fresh()->ultima_validacion->isToday());
        $this->assertTrue($licenciaB->fresh()->ultima_validacion->isToday());
    }

    public function test_no_crea_filas_nuevas_solo_revalida_las_existentes(): void
    {
        Tenant::create(['nombre' => 'Tenant sin licencia', 'pais' => 'MX', 'activo' => true]);

        Http::fake([
            'https://licencias.test/api/validar-licencia' => Http::response(['estado' => 'activa'], 200),
        ]);

        $this->artisan('licencia:revalidar')->assertExitCode(0);

        Http::assertNothingSent();
        $this->assertDatabaseCount('licencia_local', 0);
    }
}
