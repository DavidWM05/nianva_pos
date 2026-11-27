<?php

declare(strict_types=1);

namespace Tests\Feature\Seeders;

use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\FuenteConcesion;
use App\Modules\Nucleo\Services\FuenteConcesionLocal;
use App\Modules\Nucleo\Services\Planes;
use App\Modules\Tpv\Models\Venta;
use Database\Seeders\Escenarios\EscenariosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ConcesionEscenariosTest extends TestCase
{
    use RefreshDatabase;

    public function test_siembra_los_cuatro_escenarios_sin_dejar_concesiones_activas(): void
    {
        $this->app->bind(FuenteConcesion::class, FuenteConcesionLocal::class);
        config(['planes.instalacion' => null, 'planes.concesiones' => [], 'planes.entorno' => 'escritorio']);

        $this->seed(EscenariosSeeder::class);

        $tenants = Tenant::query()->get();
        $this->assertCount(4, $tenants);
        foreach ($tenants as $tenant) {
            $this->assertTrue(Venta::sinTenant()->where('tenant_id', $tenant->id)->exists());
            $this->assertSame('basico', app(Planes::class)->deTenant($tenant->id)->codigo);
        }
        $this->assertSame([], config('planes.concesiones'));
        $this->assertSame('escritorio', config('planes.entorno'));
        $this->assertSame('basico', app(Planes::class)->deTenant(Tenant::factory()->create()->id)->codigo);
    }
}
