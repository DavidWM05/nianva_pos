<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;
use App\Modules\Produccion\Models\TransformacionProducto;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\PreparaArq04e;
use Tests\TestCase;

#[Group('concurrencia')]
class Actions04eConcurrentesTest extends TestCase
{
    use PreparaArq04e;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame('mysql', DB::connection()->getDriverName(), 'Concurrencia requiere MySQL real.');
    }

    public function test_conversion_simultanea_genera_una_venta_y_descontar_stock_una_vez(): void
    {
        $d = $this->negocio04e();
        $this->competir($d, 'cotizaciones', $d['cotizacion']->id, 'cotizacion_convertir', ['cotizacion_convertir', 'cotizacion_ya_convertida'], ['cotizaciones', 'inventario_stock']);
        $this->assertSame(1, Venta::where('tenant_id', $d['tenant']->id)->count());
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        $this->assertSame('convertida', $d['cotizacion']->fresh()->estado);
    }

    public function test_primera_cotizacion_concurrente_reserva_correlativos_distintos(): void
    {
        $d = $this->negocio04e();
        $d['cotizacion']->detalles()->delete();
        $d['cotizacion']->delete();
        $this->competir($d, 'tenants', $d['tenant']->id, 'cotizacion_crear', ['cotizacion_crear', 'cotizacion_crear'], ['tenants']);
        $this->assertSame(['COT-000001', 'COT-000002'], Cotizacion::where('tenant_id', $d['tenant']->id)->orderBy('id')->pluck('numero_cotizacion')->all());
    }

    public function test_completar_la_misma_orden_dos_veces_no_duplica_la_produccion(): void
    {
        $d = $this->negocio04e();
        $this->competir($d, 'ordenes_produccion', $d['orden']->id, 'produccion_completar', ['produccion_completar', 'orden_produccion_no_completable'], ['ordenes_produccion', 'insumo_stocks', 'inventario_stock']);
        $this->assertSame(0.0, (float) $d['lote']->fresh()->cantidad);
        $this->assertSame(1, $d['stockDestino']->fresh()->stock_actual);
        $this->assertSame(1, Kardex::where('referencia_tabla', 'ordenes_produccion')->where('referencia_id', $d['orden']->id)->count());
    }

    public function test_dos_ordenes_no_consumen_dos_veces_el_ultimo_insumo(): void
    {
        $d = $this->negocio04e();
        $otraReceta = Receta::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['destino']->id, 'rendimiento' => 1]);
        RecetaIngrediente::factory()->create(['receta_id' => $otraReceta->id, 'insumo_id' => $d['insumo']->id, 'cantidad' => 1, 'unidad_medida_id' => $d['insumo']->unidad_medida_id]);
        $d['orden2'] = OrdenProduccion::factory()->create(['receta_id' => $otraReceta->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id]);
        $this->competir($d, 'insumo_stocks', $d['lote']->id, 'produccion_insumos', ['produccion_insumos', 'stock_insumos_insuficiente'], ['ordenes_produccion', 'insumo_stocks', 'inventario_stock']);
        $this->assertSame(0.0, (float) $d['lote']->fresh()->cantidad);
        $this->assertSame(1, $d['stockDestino']->fresh()->stock_actual);
        $this->assertSame(1, OrdenProduccion::whereIn('id', [$d['orden']->id, $d['orden2']->id])->where('estado', 'completada')->count());
    }

    public function test_transformaciones_no_sobregiran_el_stock_origen(): void
    {
        $d = $this->negocio04e();
        $this->competir($d, 'inventario_stock', $d['stock']->id, 'transformar', ['transformar', 'stock_insuficiente'], ['inventario_stock']);
        $this->assertSame(2, $d['stock']->fresh()->stock_actual);
        $this->assertSame(4, $d['stockDestino']->fresh()->stock_actual);
        $this->assertSame(1, TransformacionProducto::where('tenant_id', $d['tenant']->id)->count());
        $this->assertSame(2, Kardex::where('referencia_tabla', 'transformaciones')->count());
    }

    public function test_entradas_de_insumos_conservan_ambas_cantidades(): void
    {
        $d = $this->negocio04e();
        $this->competir($d, 'insumo_stocks', $d['lote']->id, 'insumo_entrada', ['insumo_entrada', 'insumo_entrada'], ['insumos', 'insumo_stocks']);
        $this->assertSame(5.0, (float) $d['lote']->fresh()->cantidad);
        $this->assertSame(1, InsumoStock::where('insumo_id', $d['insumo']->id)->where('sucursal_id', $d['sucursal']->id)->count());
    }

    private function competir(array $d, string $tabla, int $id, string $op, array $esperados, array $tablas): void
    {
        $hijos = [];
        config(['database.connections.bloqueador04e' => config('database.connections.'.DB::getDefaultConnection())]);
        $bloqueador = DB::connection('bloqueador04e');
        try {
            $bloqueador->beginTransaction();
            $bloqueador->table($tabla)->where('id', $id)->lockForUpdate()->first();
            $datos = ['tenant' => $d['tenant']->id, 'sucursal' => $d['sucursal']->id, 'usuario' => $d['usuario']->id, 'cliente' => $d['cliente']->id, 'metodo' => $d['metodo']->id, 'variante' => $d['variante']->id];
            foreach (['cotizacion', 'orden', 'destino', 'insumo'] as $modelo) {
                if (isset($d[$modelo])) {
                    $datos[$modelo] = $d[$modelo]->id;
                }
            }
            for ($i = 0; $i < 2; $i++) {
                $actor = $datos;
                if ($i === 1 && isset($d['orden2'])) {
                    $actor['orden'] = $d['orden2']->id;
                }
                $hijos[] = ProcesosConcurrentes::iniciar($op, $actor);
            }
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::esperarBloqueo($hijo);
            }
            $bloqueador->commit();
            $resultados = [];
            foreach ($hijos as $hijo) {
                $hijo->wait();
                $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                foreach ($tablas as $tablaSaldo) {
                    $lecturas = array_values(array_filter($eventos, static fn (array $e): bool => ($e['bloqueo'] ?? null) === $tablaSaldo));
                    $this->assertNotEmpty($lecturas, $tablaSaldo);
                    $this->assertTrue($lecturas[0]['for_update'], 'La Action debe leer '.$tablaSaldo.' con SELECT FOR UPDATE.');
                    $this->assertGreaterThan(0, $lecturas[0]['transaccion']);
                }
                $resultados[] = $eventos[array_key_last($eventos)]['resultado'];
            }
            sort($resultados);
            sort($esperados);
            $this->assertSame($esperados, $resultados);
        } finally {
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
            if ($bloqueador->transactionLevel() > 0) {
                $bloqueador->rollBack();
            }
            DB::purge('bloqueador04e');
            app(TenantContext::class)->set($d['tenant']);
        }
    }
}
