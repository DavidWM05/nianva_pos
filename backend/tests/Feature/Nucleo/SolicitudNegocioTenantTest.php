<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SolicitudNegocioTenantTest extends TestCase
{
    public function test_en_http_sin_tenant_sigue_abortando_con_500(): void
    {
        Route::post('/api/v1/_test/solicitud-sin-tenant', function (SolicitudNegocioDePrueba $request) {
            return response()->noContent();
        });

        $this->postJson('/api/v1/_test/solicitud-sin-tenant', ['nombre' => 'Prueba'])
            ->assertStatus(500);
    }

    public function test_en_consola_sin_tenant_devuelve_0(): void
    {
        $this->app->instance('request', Request::create('/'));

        $request = new SolicitudNegocioDePrueba;
        $request->setContainer($this->app);
        $request->setRedirector($this->app['redirect']);

        $this->assertSame(0, $request->tenantIdParaPrueba());
    }
}

class SolicitudNegocioDePrueba extends SolicitudNegocio
{
    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        $this->tenantId();

        return ['nombre' => ['required', 'string']];
    }

    public function toDto(): object
    {
        return new \stdClass;
    }

    public function tenantIdParaPrueba(): int
    {
        return $this->tenantId();
    }
}
