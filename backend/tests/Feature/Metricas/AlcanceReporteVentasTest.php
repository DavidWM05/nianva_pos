<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Metricas\Services\CalendarioMetricas;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Models\Venta;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\Clock\MockClock;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class AlcanceReporteVentasTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private const URL = '/api/v1/ventas/reporte?fecha_desde=2026-06-11&fecha_hasta=2026-06-11';

    public function test_vendedor_solo_ve_su_sucursal_aunque_solicite_otra(): void
    {
        [$usuario, $propia, $otra] = $this->escenario(['reportes.ver']);
        $this->actingAs($usuario);

        $this->getJson(self::URL)->assertOk()
            ->assertJsonPath('data.sucursal_id', $propia->id)
            ->assertJsonPath('data.totales.vendido', '100.03');

        $this->getJson(self::URL.'&sucursal_id='.$otra->id)->assertOk()
            ->assertJsonPath('data.sucursal_id', $propia->id)
            ->assertJsonPath('data.totales.vendido', '100.03');
    }

    public function test_gerente_ve_el_consolidado_y_las_sucursales_forman_una_particion(): void
    {
        [$usuario, $propia, $otra] = $this->escenario(['reportes.ver', 'sucursales.todas']);
        $this->actingAs($usuario);

        $consolidado = $this->getJson(self::URL)->assertOk()
            ->assertJsonPath('data.sucursal_id', null)
            ->assertJsonPath('data.totales.vendido', '300.05')
            ->assertJsonPath('data.totales.tickets', 2);

        $uno = $this->getJson(self::URL.'&sucursal_id='.$propia->id)->assertOk()
            ->assertJsonPath('data.sucursal_id', $propia->id)
            ->assertJsonPath('data.totales.vendido', '100.03');

        $dos = $this->getJson(self::URL.'&sucursal_id='.$otra->id)->assertOk()
            ->assertJsonPath('data.sucursal_id', $otra->id)
            ->assertJsonPath('data.totales.vendido', '200.02');

        self::assertSame(
            $consolidado->json('data.totales.vendido'),
            Dinero::desde($uno->json('data.totales.vendido'))->sumar(Dinero::desde($dos->json('data.totales.vendido')))->aCadena(),
        );
        self::assertSame(
            $consolidado->json('data.totales.tickets'),
            $uno->json('data.totales.tickets') + $dos->json('data.totales.tickets'),
        );
    }

    public function test_el_reporte_aplica_la_fecha_local_a_las_2030_y_a_las_0030(): void
    {
        [$usuario, $propia] = $this->escenario(['reportes.ver']);
        ConfiguracionTenant::factory()->create([
            'tenant_id' => $usuario->tenant_id,
            'zona_horaria' => 'America/Tijuana',
        ]);
        Venta::factory()->create([
            'tenant_id' => $usuario->tenant_id,
            'sucursal_id' => $propia->id,
            'total' => '40.00',
            'fecha' => '2026-06-12 03:30:00',
        ]);
        Venta::factory()->create([
            'tenant_id' => $usuario->tenant_id,
            'sucursal_id' => $propia->id,
            'total' => '60.00',
            'fecha' => '2026-06-12 07:30:00',
        ]);
        $reloj = new MockClock('2026-06-12T03:30:00Z');
        $this->instance(CalendarioMetricas::class, new CalendarioMetricas($reloj));
        $this->actingAs($usuario);

        $this->getJson('/api/v1/ventas/reporte')->assertOk()
            ->assertJsonPath('data.periodo.hasta', '2026-06-11')
            ->assertJsonPath('data.totales.vendido', '140.03');
        $this->getJson(self::URL)->assertOk()
            ->assertJsonPath('data.totales.vendido', '140.03');

        $this->getJson('/api/v1/inicio/resumen')->assertOk()
            ->assertJsonPath('data.fecha_corte', '2026-06-11')
            ->assertJsonPath('data.ventas_hoy.total', '140.03')
            ->assertJsonPath('data.ventas_netas_comerciales_mes', '140.03')
            ->assertJsonPath('data.ventas_ultimos_siete_dias.6.vendido', '140.03');

        $reloj->sleep(4 * 3600);

        $this->getJson('/api/v1/ventas/reporte')->assertOk()
            ->assertJsonPath('data.periodo.hasta', '2026-06-12')
            ->assertJsonPath('data.totales.vendido', '200.03');
        $this->getJson('/api/v1/ventas/reporte?fecha_desde=2026-06-12&fecha_hasta=2026-06-12')->assertOk()
            ->assertJsonPath('data.totales.vendido', '60.00');
    }

    public function test_el_filtro_incompleto_fuera_del_corte_responde_422(): void
    {
        [$usuario] = $this->escenario(['reportes.ver']);
        $this->instance(CalendarioMetricas::class, new CalendarioMetricas(new MockClock('2026-06-12T12:00:00Z')));
        $this->actingAs($usuario);

        $this->getJson('/api/v1/ventas/reporte?fecha_desde=2026-07-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('fecha_hasta');
    }

    public function test_una_venta_en_el_cruce_entra_en_su_fecha_local_y_queda_fuera_del_dia_utc(): void
    {
        [$usuario, $sucursal] = $this->escenario(['reportes.ver']);
        $configuracion = ConfiguracionTenant::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $this->actingAs($usuario);

        foreach ([['America/Tijuana', '2026-06-11 20:30:00'], ['Asia/Tokyo', '2026-06-12 00:30:00']] as $indice => [$zona, $hora]) {
            $configuracion->update(['zona_horaria' => $zona]);
            $instante = CarbonImmutable::parse($hora, $zona);
            $utc = $instante->utc();
            CarbonImmutable::setTestNow($utc);
            try {
                $this->instance(CalendarioMetricas::class, new CalendarioMetricas(new MockClock(CarbonImmutable::now())));
                $venta = Venta::factory()->create([
                    'tenant_id' => $usuario->tenant_id,
                    'sucursal_id' => $sucursal->id,
                    'folio' => 'V-1-'.(998 + $indice),
                    'fecha' => $utc->toDateTimeString(),
                ]);
                $ruta = static fn (string $fecha): string => "/api/v1/ventas/reporte?fecha_desde={$fecha}&fecha_hasta={$fecha}";
                $operacion = ['folio' => $venta->getAttribute('folio')];
                $this->getJson($ruta($instante->toDateString()))->assertOk()->assertJsonFragment($operacion);
                $this->getJson($ruta($utc->toDateString()))->assertOk()->assertJsonMissing($operacion);
            } finally {
                CarbonImmutable::setTestNow();
            }
        }
    }

    /** @param list<string> $permisos
     * @return array{Usuario, Sucursal, Sucursal}
     */
    private function escenario(array $permisos): array
    {
        $tenant = Tenant::factory()->create();
        $propia = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $otra = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $propia->id]);
        $this->darPermisosA($usuario, $permisos);

        Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $propia->id, 'total' => '100.03', 'fecha' => '2026-06-11 12:00:00']);
        Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $otra->id, 'total' => '200.02', 'fecha' => '2026-06-11 12:00:00']);
        Venta::factory()->create(['fecha' => '2026-06-11 12:00:00']);

        return [$usuario, $propia, $otra];
    }
}
