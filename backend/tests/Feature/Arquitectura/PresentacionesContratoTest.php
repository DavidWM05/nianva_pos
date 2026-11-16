<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Support\DecimalApi;
use Tests\TestCase;

class PresentacionesContratoTest extends TestCase
{
    public function test_las_lineas_conservan_ids_y_los_campos_de_presentacion_son_opcionales(): void
    {
        $api = json_decode(file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        foreach (['VentaLineaResource', 'CotizacionVentaLineaResource'] as $nombre) {
            $s = $api['components']['schemas'][$nombre];
            $this->assertSame('integer', $s['properties']['variante_id']['type']);
            $this->assertSame('string', $s['properties']['factor']['type']);
            $this->assertSame(DecimalApi::PATRON_CANTIDAD, $s['properties']['factor']['pattern']);
            foreach (['presentacion_id', 'presentacion_nombre', 'factor'] as $campo) {
                $this->assertNotContains($campo, $s['required']);
            }
        }
        $this->assertSame(['object', 'null'], $api['components']['schemas']['VentaLineaResource']['properties']['variante']['type']);
        $this->assertSame('string', $api['components']['schemas']['VentaLineaResource']['properties']['variante']['properties']['producto_nombre']['type']);
        $ref = $api['paths']['/ventas/cotizar']['post']['responses']['200']['content']['application/json']['schema']['properties']['data']['properties']['items']['items']['$ref'];
        $this->assertSame('#/components/schemas/CotizacionVentaLineaResource', $ref);
    }
}
