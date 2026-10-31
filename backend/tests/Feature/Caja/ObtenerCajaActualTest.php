<?php

namespace Tests\Feature\Caja;

use App\Aplicacion\Caja\ObtenerCajaActual;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ObtenerCajaActualTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_provider_carga_las_migraciones_de_ventas_plazos(): void
    {
        $this->assertTrue(Schema::hasTable('planes_pago_cliente'));
        $this->assertTrue(Schema::hasTable('planes_pago_cliente_cuotas'));
    }

    public function test_con_caja_abierta_y_gastos_devuelve_la_sesion_y_el_total(): void
    {
        $usuario = Usuario::factory()->create();
        $caja = CajaSesion::factory()->create([
            'sucursal_id' => $usuario->sucursal_id,
            'usuario_id' => $usuario->id,
        ]);
        Gasto::factory()->create([
            'caja_sesion_id' => $caja->id,
            'sucursal_id' => $usuario->sucursal_id,
            'usuario_id' => $usuario->id,
            'monto' => 80,
        ]);

        $resultado = app(ObtenerCajaActual::class)->ejecutar($usuario);

        $this->assertSame($caja->id, $resultado['sesion']?->id);
        $this->assertSame(0, $resultado['resumen']['ventas_count']);
        $this->assertSame(0.0, (float) $resultado['resumen']['total_ventas']);
        $this->assertSame(80.0, (float) $resultado['resumen']['total_gastos']);
    }

    public function test_sin_caja_abierta_devuelve_la_misma_respuesta_vacia(): void
    {
        $usuario = Usuario::factory()->create();

        $resultado = app(ObtenerCajaActual::class)->ejecutar($usuario);

        $this->assertNull($resultado['sesion']);
        $this->assertNull($resultado['resumen']);
        $this->assertSame(
            ['abrir', 'cerrar', 'gastos_ver', 'gastos_crear'],
            array_keys($resultado['permisos']),
        );
    }
}
