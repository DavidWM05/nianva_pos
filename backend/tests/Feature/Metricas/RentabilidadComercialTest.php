<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Metricas\Services\CalendarioMetricas;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class RentabilidadComercialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private const REPORTE = '/api/v1/ventas/reporte';

    private const INICIO = '/api/v1/inicio/resumen';

    public function test_comparten_rentabilidad_el_reporte_inicio_y_csv_con_el_permiso(): void
    {
        $this->prepararNegocio(['reportes.ver', 'reportes.costos', 'reportes.exportar']);
        $this->conCorteCivil();
        $venta = $this->venta();
        $this->linea($venta, ['cantidad' => '2.000', 'factor' => '0.500']);
        $this->linea($venta, ['importe_efectivo' => '11.60', 'impuesto' => '1.60', 'costo_unitario' => '0.00']);
        $venta->update(['total' => '127.60']);

        $sombra = $this->venta(['es_venta_sombra' => true, 'total' => '58.00']);
        $this->linea($sombra, ['importe_efectivo' => '58.00', 'impuesto' => '8.00', 'costo_unitario' => '25.00']);

        $cambio = Devolucion::factory()->create([
            'venta_id' => $venta->id,
            'venta_sombra_id' => $sombra->id,
            'tipo' => 'cambio',
            'monto_devolucion' => '116.00',
            'monto_cambio' => '58.00',
            'diferencia' => '-58.00',
            'fecha' => '2026-07-01 03:30:00',
        ]);
        DevolucionItem::factory()->create([
            'devolucion_id' => $cambio->id, 'variante_id' => $this->variante->id,
            'tipo' => 'devuelto', 'subtotal' => '116.00', 'impuesto' => '16.00',
            'cantidad' => 2, 'factor' => '0.500', 'costo_unitario' => '60.00', 'va_a_merma' => true,
        ]);
        DevolucionItem::factory()->create([
            'devolucion_id' => $cambio->id, 'variante_id' => $this->varianteExtra->id,
            'tipo' => 'nuevo', 'subtotal' => '58.00', 'impuesto' => '8.00',
            'costo_unitario' => '25.00', 'va_a_merma' => false,
        ]);

        $this->actingAs($this->usuario);
        $esperado = [
            'ingreso_sin_iva' => '60.00',
            'costo_neto_ventas' => '25.00',
            'utilidad_bruta' => '35.00',
            'margen_porcentaje' => '58.33',
            'merma' => '60.00',
            'resultado_despues_merma' => '-25.00',
            'lineas_sin_costo' => 1,
        ];

        self::assertSame($esperado, $this->getJson(self::REPORTE)->assertOk()->json('data.rentabilidad'));
        self::assertSame($esperado, $this->getJson(self::INICIO)->assertOk()->json('data.rentabilidad_mes'));
        $csv = $this->csv();
        foreach ($esperado as $metrica => $valor) {
            self::assertStringContainsString("rentabilidad.{$metrica},{$valor}", $csv);
        }
        self::assertStringNotContainsString('costo_unitario', $csv);
    }

    public function test_sin_permiso_de_costos_los_tres_consumidores_conservan_solo_datos_comerciales(): void
    {
        $this->prepararNegocio(['reportes.ver', 'reportes.exportar']);
        $this->conCorteCivil();
        $this->linea($this->venta());

        $this->actingAs($this->usuario)->getJson(self::REPORTE)->assertOk()->assertJsonMissingPath('data.rentabilidad');
        $this->getJson(self::INICIO)->assertOk()->assertJsonMissingPath('data.rentabilidad_mes');
        self::assertStringNotContainsString('rentabilidad.', $this->csv());
    }

    public function test_sin_ingreso_el_margen_no_aplica_y_el_apartado_usa_el_dia_civil(): void
    {
        $this->prepararNegocio(['reportes.ver', 'reportes.costos']);
        $this->conCorteCivil();
        Apartado::factory()->create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'fecha_vencimiento' => '2026-07-01',
        ]);

        $this->actingAs($this->usuario)->getJson(self::INICIO)->assertOk()
            ->assertJsonPath('data.fecha_corte', '2026-06-30')
            ->assertJsonPath('data.apartados_por_vencer.0.dias_para_vencer', 1)
            ->assertJsonPath('data.rentabilidad_mes.utilidad_bruta', '0.00')
            ->assertJsonPath('data.rentabilidad_mes.margen_porcentaje', null);
        $this->getJson(self::REPORTE.'/exportar')->assertForbidden();
    }

    public function test_consolidado_suma_importes_y_respeta_sucursal_y_tenant(): void
    {
        $this->prepararNegocio(['reportes.ver', 'reportes.costos', 'sucursales.todas']);
        $this->conCorteCivil();
        $otra = Sucursal::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->linea($this->venta());
        $this->linea($this->venta(['sucursal_id' => $otra->id, 'total' => '232.00']), [
            'importe_efectivo' => '232.00', 'impuesto' => '32.00', 'costo_unitario' => '160.00',
        ]);
        $ajena = $this->venta([
            'tenant_id' => $this->tenantB->id, 'sucursal_id' => $this->sucursalB->id,
        ]);
        $this->linea($ajena, ['variante_id' => $this->varianteB->id]);

        $this->actingAs($this->usuario)->getJson(self::REPORTE)->assertOk()
            ->assertJsonPath('data.rentabilidad.ingreso_sin_iva', '300.00')
            ->assertJsonPath('data.rentabilidad.utilidad_bruta', '80.00')
            ->assertJsonPath('data.rentabilidad.margen_porcentaje', '26.67');
        $this->getJson(self::REPORTE.'?sucursal_id='.$otra->id)->assertOk()
            ->assertJsonPath('data.rentabilidad.ingreso_sin_iva', '200.00')
            ->assertJsonPath('data.rentabilidad.utilidad_bruta', '40.00')
            ->assertJsonPath('data.rentabilidad.margen_porcentaje', '20.00');
    }

    private function conCorteCivil(): void
    {
        ConfiguracionTenant::factory()->create([
            'tenant_id' => $this->tenant->id, 'zona_horaria' => 'America/Tijuana',
        ]);
        $this->instance(CalendarioMetricas::class, new CalendarioMetricas(new MockClock('2026-07-01T03:30:00Z')));
    }

    private function venta(array $atributos = []): Venta
    {
        return Venta::factory()->create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'total' => '116.00', 'fecha' => '2026-06-30 20:00:00', ...$atributos,
        ]);
    }

    private function linea(Venta $venta, array $atributos = []): void
    {
        VentaDetalle::factory()->create([
            'venta_id' => $venta->id, 'variante_id' => $this->variante->id,
            'importe_efectivo' => '116.00', 'impuesto' => '16.00', 'costo_unitario' => '60.00', ...$atributos,
        ]);
    }

    private function csv(): string
    {
        $respuesta = $this->getJson(self::REPORTE.'/exportar')->assertOk()->baseResponse;
        self::assertInstanceOf(BinaryFileResponse::class, $respuesta);
        $archivo = $respuesta->getFile()->getPathname();
        try {
            return (string) file_get_contents($archivo);
        } finally {
            unlink($archivo);
        }
    }
}
