<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Exceptions\LicenciaActivacionFallidaException;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\EstadoLicenciaPos;
use App\Modules\Nucleo\Services\FuenteConcesion;
use App\Modules\Nucleo\Services\FuenteConcesionLicencia;
use App\Modules\Nucleo\Services\IdentidadLicencia;
use App\Modules\Nucleo\Services\LicenciaClienteService;
use App\Modules\Nucleo\Services\TokenLicenciaPos;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\Support\FirmaLicenciaPos;
use Tests\TestCase;

final class LicenciaInstaladaTest extends TestCase
{
    use FirmaLicenciaPos, RefreshDatabase;

    public function test_activacion_envia_codigo_de_activacion_y_no_id_del_tenant(): void
    {
        $this->prepararFirmaLicencia();
        config(['licencias.servidor_url' => 'https://licencias.test']);
        Http::fake(['https://licencias.test/api/validar-licencia' => Http::response([], 404)]);
        $tenant = Tenant::factory()->create();

        try {
            app(LicenciaClienteService::class)->activar($tenant, 'CODIGO-POS');
        } catch (LicenciaActivacionFallidaException) {
            // El rechazo del emisor permite observar la solicitud sin instalar una licencia.
        }

        Http::assertSent(fn ($request) => $request['producto_slug'] === 'nianva-pos'
            && $request['codigo_activacion'] === 'CODIGO-POS'
            && ! isset($request['tenant_id_producto'])
            && is_string($request['identificador_instancia'])
            && $request['token_actual'] === null);
    }

    public function test_verifica_dos_llaves_y_rechaza_firma_kid_producto_e_identidad_invalidos(): void
    {
        $this->prepararFirmaLicencia();
        $servicio = app(TokenLicenciaPos::class);
        $instancia = app(IdentidadLicencia::class)->identificador();
        $this->assertNotNull($servicio->verificar($this->tokenPos(), $instancia));
        $this->assertNotNull($servicio->verificar($this->tokenPos(kid: 'segunda', firmante: 'segunda'), $instancia));
        $this->assertNotNull($servicio->verificar($this->tokenPos(kid: null, firmante: 'segunda'), $instancia));
        $this->assertNull($servicio->verificar($this->tokenPos(kid: 'desconocido'), $instancia));
        $this->assertNull($servicio->verificar($this->tokenPos(firmante: 'segunda'), $instancia));
        $this->assertNull($servicio->verificar($this->tokenPos(['producto_id' => 322]), $instancia));
        $this->assertNull($servicio->verificar($this->tokenPos(), (string) Str::uuid()));
        $token = $this->tokenPos();
        $inicioFirma = strrpos($token, '.') + 1;
        $alterado = substr_replace($token, $token[$inicioFirma] === 'A' ? 'B' : 'A', $inicioFirma, 1);
        $this->assertNull($servicio->verificar($alterado, $instancia));
    }

    public function test_la_gracia_corta_al_segundo_exacto_y_la_perpetua_permanece_operativa(): void
    {
        $this->prepararFirmaLicencia();
        $estado = app(EstadoLicenciaPos::class);
        $licencia = new LicenciaLocal([
            'estado' => 'activa',
            'ultima_validacion' => '2026-11-01 08:00:00',
            'token_firmado' => $this->tokenPos(['tipo' => 'demo', 'fecha_expiracion' => '2026-11-30']),
        ]);

        $this->travelTo(CarbonImmutable::parse('2026-11-08 07:59:59', 'UTC'));
        $this->assertTrue($estado->enGracia($licencia));
        $this->assertNull($estado->motivo($licencia));
        $this->travelTo(CarbonImmutable::parse('2026-11-08 08:00:00', 'UTC'));
        $this->assertSame('gracia_agotada', $estado->motivo($licencia));

        $licencia->setAttribute('token_firmado', $this->tokenPos(['fecha_expiracion' => '2023-01-01']));
        $this->travelTo(CarbonImmutable::parse('2027-11-01 08:00:00', 'UTC'));
        $this->assertNull($estado->motivo($licencia));
        $this->assertFalse($estado->enGracia($licencia));
    }

    public function test_la_licencia_revocada_permite_desbloquear_con_pin_pero_bloquea_ventas(): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);
        $usuario = Usuario::factory()->create(['pin_caja_hash' => Hash::make('7049')])->refresh();
        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/');
        $this->postJson('/api/v1/sesion/bloquear')->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());

        LicenciaLocal::sinTenant()->create([
            'tenant_id' => $usuario->tenant_id, 'tipo' => 'pago_unico', 'estado' => 'revocada',
            'fecha_inicio' => now()->toDateString(),
        ]);

        $this->postJson('/api/v1/sesion/desbloquear', ['pin' => '7049'])->assertNoContent();
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.usuario.id', $usuario->id);
        $this->postJson('/api/v1/ventas')->assertForbidden()->assertJsonPath('error_code', 'licencia_solo_lectura');
    }

    public function test_usa_concesion_firmada_en_sesion_y_cuota_y_bloquea_escritura_al_revocar(): void
    {
        $this->prepararFirmaLicencia();
        $this->app->bind(FuenteConcesion::class, FuenteConcesionLicencia::class);
        $this->seed(NucleoRolesPermisosSeeder::class);
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        $licencia = LicenciaLocal::sinTenant()->create([
            'tenant_id' => $admin->tenant_id, 'tipo' => 'pago_unico', 'estado' => 'activa',
            'fecha_inicio' => now()->toDateString(), 'ultima_validacion' => now(),
            'codigo_activacion' => 'CODIGO-POS', 'token_firmado' => $this->tokenPos(),
        ]);

        $this->actingAs($admin)->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.codigo', 'avanzado')
            ->assertJsonPath('data.modulos_activos', ['cotizaciones'])
            ->assertJsonPath('data.limites.terminales.maximo', 3);

        foreach (range(1, 3) as $i) {
            $this->postJson('/api/v1/terminales', ['nombre' => 'Terminal '.$i, 'sucursal_id' => $admin->sucursal_id])->assertCreated();
        }
        $datos = ['nombre' => 'Terminal adicional', 'sucursal_id' => $admin->sucursal_id];
        $this->postJson('/api/v1/terminales', $datos)->assertUnprocessable()->assertJsonPath('error_code', 'limite_plan_excedido');

        config(['licencias.servidor_url' => 'https://licencias.test']);
        Http::fake(['https://licencias.test/api/validar-licencia' => Http::response(['estado' => 'revocada', 'token' => null])]);
        app(LicenciaClienteService::class)->revalidar($licencia);

        $this->postJson('/api/v1/terminales', $datos)->assertForbidden()
            ->assertJsonPath('error_code', 'licencia_solo_lectura')->assertJsonPath('motivo', 'revocada');
        $this->getJson('/api/v1/terminales')->assertOk();
        $this->getJson('/api/v1/sesion')->assertOk();
    }
}
