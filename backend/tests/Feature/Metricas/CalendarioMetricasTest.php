<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Metricas\Services\CalendarioMetricas;
use App\Modules\Metricas\Services\CrearContextoMetricas;
use App\Modules\Metricas\Valores\PeriodoMetricas;
use App\Modules\Nucleo\Exceptions\SucursalNoPermitidaException;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Symfony\Component\Clock\MockClock;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class CalendarioMetricasTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_el_reloj_cruza_a_otro_dia_y_mes_en_la_zona_del_tenant(): void
    {
        $reloj = new MockClock('2026-02-01T05:30:00Z');
        $calendario = new CalendarioMetricas($reloj);
        $zona = new DateTimeZone('America/Mexico_City');

        self::assertSame('2026-01-31', $calendario->fechaLocal($zona));
        $enero = $calendario->mesActual($zona);
        self::assertSame('2026-01-01T06:00:00+00:00', $enero->inicioUtc->format(DATE_ATOM));
        self::assertTrue($enero->contiene($reloj->now()));

        $reloj->sleep(3600);

        self::assertSame('2026-02-01', $calendario->fechaLocal($zona));
        $febrero = $calendario->mesActual($zona);
        self::assertFalse($enero->contiene($reloj->now()));
        self::assertTrue($febrero->contiene($reloj->now()));
        self::assertEquals($enero->finUtcExclusivo, $febrero->inicioUtc);
    }

    public function test_media_noche_es_inclusiva_al_inicio_y_exclusiva_al_final(): void
    {
        $periodo = PeriodoMetricas::entre('2026-06-11', '2026-06-11', new DateTimeZone('America/Tijuana'));

        self::assertFalse($periodo->contiene(new DateTimeImmutable('2026-06-10T23:30:00-07:00')));
        self::assertTrue($periodo->contiene(new DateTimeImmutable('2026-06-11T00:00:00-07:00')));
        self::assertTrue($periodo->contiene(new DateTimeImmutable('2026-06-11T00:30:00-07:00')));
        self::assertFalse($periodo->contiene(new DateTimeImmutable('2026-06-12T00:00:00-07:00')));
    }

    public function test_los_dias_de_cambio_de_hora_duran_23_y_25_horas(): void
    {
        $zona = new DateTimeZone('America/New_York');
        $primavera = PeriodoMetricas::entre('2026-03-08', '2026-03-08', $zona);
        $otono = PeriodoMetricas::entre('2026-11-01', '2026-11-01', $zona);

        self::assertSame(23 * 3600, $primavera->finUtcExclusivo->getTimestamp() - $primavera->inicioUtc->getTimestamp());
        self::assertSame(25 * 3600, $otono->finUtcExclusivo->getTimestamp() - $otono->inicioUtc->getTimestamp());
        self::assertTrue($otono->contiene(new DateTimeImmutable('2026-11-01T01:30:00-04:00')));
        self::assertTrue($otono->contiene(new DateTimeImmutable('2026-11-01T01:30:00-05:00')));
    }

    public function test_el_periodo_rechaza_fechas_civiles_imposibles(): void
    {
        $this->expectException(InvalidArgumentException::class);
        PeriodoMetricas::entre('2026-02-30', '2026-03-01', new DateTimeZone('UTC'));
    }

    public function test_el_periodo_rechaza_el_rango_invertido(): void
    {
        $this->expectException(InvalidArgumentException::class);
        PeriodoMetricas::entre('2026-03-02', '2026-03-01', new DateTimeZone('UTC'));
    }

    public function test_contexto_aplica_tenant_zona_y_sucursal_propia_o_alcance_del_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        ConfiguracionTenant::factory()->create(['tenant_id' => $tenant->id, 'zona_horaria' => 'America/Tijuana']);
        $tenantContext = app(TenantContext::class);
        $tenantContext->set($tenant);
        $fabrica = new CrearContextoMetricas($tenantContext, new CalendarioMetricas(new MockClock('2026-06-12T06:30:00Z')));

        $ventas = $fabrica->paraSucursal($usuario, '2026-06-11', '2026-06-11');
        $cartera = $fabrica->paraTenant($usuario, '2026-06-11', '2026-06-11');

        self::assertSame($tenant->id, $ventas->tenantId);
        self::assertSame($sucursal->id, $ventas->sucursalId);
        self::assertSame('America/Tijuana', $ventas->zona->getName());
        self::assertSame('2026-06-11', $ventas->fechaCorte);
        self::assertSame('2026-06-11T07:00:00+00:00', $ventas->periodo->inicioUtc->format(DATE_ATOM));
        self::assertNull($cartera->sucursalId);
    }

    public function test_contexto_rechaza_una_sucursal_ajena(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        $ajena = Sucursal::factory()->create();
        $tenantContext = app(TenantContext::class);
        $tenantContext->set($tenant);
        $fabrica = new CrearContextoMetricas($tenantContext, new CalendarioMetricas(new MockClock('2026-06-12T06:30:00Z')));

        $this->expectException(SucursalNoPermitidaException::class);
        $fabrica->paraSucursal($usuario, '2026-06-11', '2026-06-11', $ajena->id);
    }

    public function test_el_permiso_no_amplia_el_filtro_por_omision_y_permite_elegir_otra_sucursal(): void
    {
        $tenant = Tenant::factory()->create();
        $propia = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $otra = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $propia->id]);
        $this->darPermisosA($usuario, ['sucursales.todas']);
        app(TenantContext::class)->set($tenant);
        $fabrica = app(CrearContextoMetricas::class);

        self::assertSame($propia->id, $fabrica->paraSucursal($usuario, '2026-06-11', '2026-06-11')->sucursalId);
        self::assertSame($otra->id, $fabrica->paraSucursal($usuario, '2026-06-11', '2026-06-11', $otra->id)->sucursalId);
    }

    public function test_contexto_rechaza_si_el_usuario_no_pertenece_al_tenant_activo(): void
    {
        $tenantActivo = Tenant::factory()->create();
        $tenantAjeno = Tenant::factory()->create();
        $sucursalAjena = Sucursal::factory()->create(['tenant_id' => $tenantAjeno->id]);
        $usuarioAjeno = Usuario::factory()->create(['tenant_id' => $tenantAjeno->id, 'sucursal_id' => $sucursalAjena->id]);
        app(TenantContext::class)->set($tenantActivo);

        $this->expectException(AuthorizationException::class);
        app(CrearContextoMetricas::class)->paraTenant($usuarioAjeno, '2026-06-11', '2026-06-11');
    }
}
