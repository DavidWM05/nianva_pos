<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ActivarLicenciaCommandTest extends TestCase
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

    public function test_activa_un_tenant_existente(): void
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);

        Http::fake([
            'https://licencias.test/api/validar-licencia' => Http::response([
                'estado' => 'activa',
                'tipo' => 'pago_unico',
                'token' => 'jwt-inicial',
            ], 200),
        ]);

        $this->artisan('licencia:activar', ['tenant_id' => $tenant->id])
            ->assertExitCode(0);

        $this->assertDatabaseHas('licencia_local', ['tenant_id' => $tenant->id, 'estado' => 'activa']);
    }

    public function test_falla_con_un_tenant_inexistente(): void
    {
        $this->artisan('licencia:activar', ['tenant_id' => 999999])
            ->assertExitCode(1);

        $this->assertDatabaseCount('licencia_local', 0);
    }

    public function test_falla_si_el_servidor_no_responde(): void
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);

        Http::fake([
            'https://licencias.test/api/validar-licencia' => fn () => throw new ConnectionException('sin conexion'),
        ]);

        $this->artisan('licencia:activar', ['tenant_id' => $tenant->id])
            ->assertExitCode(1);

        $this->assertDatabaseCount('licencia_local', 0);
    }
}
