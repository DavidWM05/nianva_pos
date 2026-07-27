<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Prueba que una ruta nueva queda protegida por TenantScope sin agregar
 * 'resolve.tenant' manualmente -- el middleware debe venir del grupo 'web'
 * registrado en bootstrap/app.php, no de una configuracion por ruta.
 */
class TenantScopeMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_ruta_nueva_sin_middleware_explicito_queda_aislada_por_tenant(): void
    {
        // Ruta ad-hoc solo con 'web' (lo que cualquier ruta nueva en routes/web.php
        // tendria por defecto) -- deliberadamente SIN 'resolve.tenant' explicito.
        Route::middleware('web')->get('/prueba-tenant-scope', function () {
            return response()->json([
                'resuelto' => app(TenantContext::class)->resuelto(),
                'tenant_id' => app(TenantContext::class)->id(),
                'usuarios_visibles' => Usuario::all()->pluck('correo')->values(),
            ]);
        });

        $tenant1 = Tenant::create(['nombre' => 'Tenant Uno', 'pais' => 'MX']);
        $tenant2 = Tenant::create(['nombre' => 'Tenant Dos', 'pais' => 'MX']);

        $sucursal1 = Sucursal::create(['tenant_id' => $tenant1->id, 'nombre' => 'Suc 1']);
        $sucursal2 = Sucursal::create(['tenant_id' => $tenant2->id, 'nombre' => 'Suc 2']);

        $admin1 = Usuario::create([
            'tenant_id' => $tenant1->id, 'sucursal_id' => $sucursal1->id,
            'nombre' => 'Ana', 'correo' => 'ana@test.com', 'password' => 'secret123',
        ]);
        $admin2 = Usuario::create([
            'tenant_id' => $tenant2->id, 'sucursal_id' => $sucursal2->id,
            'nombre' => 'Beto', 'correo' => 'beto@test.com', 'password' => 'secret123',
        ]);

        $comoTenant1 = $this->actingAs($admin1)->getJson('/prueba-tenant-scope');
        $comoTenant1->assertOk()->assertJson([
            'resuelto' => true,
            'tenant_id' => $tenant1->id,
            'usuarios_visibles' => ['ana@test.com'],
        ]);

        $comoTenant2 = $this->actingAs($admin2)->getJson('/prueba-tenant-scope');
        $comoTenant2->assertOk()->assertJson([
            'resuelto' => true,
            'tenant_id' => $tenant2->id,
            'usuarios_visibles' => ['beto@test.com'],
        ]);
    }
}
