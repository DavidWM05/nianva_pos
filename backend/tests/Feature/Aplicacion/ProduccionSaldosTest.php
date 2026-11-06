<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\Produccion\CambiarEstadoOrden;
use App\Aplicacion\Produccion\CompletarOrden;
use App\Aplicacion\Produccion\CrearOrdenProduccion;
use App\Aplicacion\Produccion\CrearReceta;
use App\Aplicacion\Produccion\RegistrarEntradaInsumo;
use App\Aplicacion\Produccion\RegistrarTransformacion;
use App\Modules\Produccion\Dtos\CambiarEstadoOrdenDto;
use App\Modules\Produccion\Dtos\CrearOrdenProduccionDto;
use App\Modules\Produccion\Dtos\CrearRecetaDto;
use App\Modules\Produccion\Dtos\CrearTransformacionDto;
use App\Modules\Produccion\Dtos\IngredienteRecetaDto;
use App\Modules\Produccion\Dtos\InsumoStockDto;
use App\Modules\Produccion\Exceptions\StockInsumosInsuficienteException;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\RecetaIngrediente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\PreparaArq04e;
use Tests\TestCase;

class ProduccionSaldosTest extends TestCase
{
    use PreparaArq04e;
    use RefreshDatabase;

    public function test_completar_orden_deduce_insumos_y_registra_el_producto_terminado(): void
    {
        $d = $this->negocio04e();
        $orden = app(CompletarOrden::class)->ejecutar($d['orden']->id, 1);
        $this->assertSame('completada', $orden->estado);
        $this->assertSame(0.0, (float) $d['lote']->fresh()->cantidad);
        $this->assertSame(1, $d['stockDestino']->fresh()->stock_actual);
        $this->assertDatabaseHas('kardex', ['variante_id' => $d['destino']->id, 'tipo' => 'entrada', 'cantidad' => 1, 'referencia_tabla' => 'ordenes_produccion', 'referencia_id' => $orden->id]);
    }

    public function test_insumos_insuficientes_no_producen_stock_ni_dejan_consumo_parcial(): void
    {
        $d = $this->negocio04e();
        $d['lote']->update(['cantidad' => 0]);
        try {
            app(CompletarOrden::class)->ejecutar($d['orden']->id, 1);
            $this->fail('Se esperaba stock insuficiente de insumos.');
        } catch (StockInsumosInsuficienteException) {
            $this->assertSame('pendiente', $d['orden']->fresh()->estado);
            $this->assertSame(0.0, (float) $d['lote']->fresh()->cantidad);
            $this->assertSame(0, $d['stockDestino']->fresh()->stock_actual);
            $this->assertDatabaseCount('kardex', 0);
        }
    }

    public function test_completar_deduce_lotes_fifo_y_agrupa_ingredientes_repetidos(): void
    {
        $d = $this->negocio04e();
        $tardio = InsumoStock::factory()->create(['insumo_id' => $d['insumo']->id, 'sucursal_id' => $d['sucursal']->id, 'cantidad' => 5, 'fecha_vencimiento' => now()->addDays(10)]);
        RecetaIngrediente::factory()->create(['receta_id' => $d['receta']->id, 'insumo_id' => $d['insumo']->id, 'cantidad' => 1, 'unidad_medida_id' => $d['insumo']->unidad_medida_id]);
        app(CompletarOrden::class)->ejecutar($d['orden']->id, 1);
        $this->assertSame(0.0, (float) $d['lote']->fresh()->cantidad);
        $this->assertSame(4.0, (float) $tardio->fresh()->cantidad);
        $this->assertSame(1, $d['stockDestino']->fresh()->stock_actual);
    }

    public function test_transformacion_registra_ambos_movimientos_y_sus_saldos(): void
    {
        $d = $this->negocio04e();
        $transformacion = app(RegistrarTransformacion::class)->ejecutar(new CrearTransformacionDto($d['variante']->id, $d['destino']->id, 8, 4, null), $d['usuario']);
        $this->assertNotNull($transformacion->id);
        $this->assertSame(2, $d['stock']->fresh()->stock_actual);
        $this->assertSame(4, $d['stockDestino']->fresh()->stock_actual);
        $this->assertDatabaseCount('kardex', 2);
    }

    public function test_crear_receta_y_orden_y_cambiar_su_estado(): void
    {
        $d = $this->negocio04e();
        $receta = app(CrearReceta::class)->ejecutar(new CrearRecetaDto($d['destino']->id, 'Receta 04e', 1, null, null, [new IngredienteRecetaDto($d['insumo']->id, 1, $d['insumo']->unidad_medida_id)]), $d['tenant']->id);
        $this->assertCount(1, $receta->ingredientes);
        $orden = app(CrearOrdenProduccion::class)->ejecutar(new CrearOrdenProduccionDto($receta->id, 1, null, null), $d['usuario']);
        $this->assertSame('pendiente', $orden->estado);
        $cambiada = app(CambiarEstadoOrden::class)->ejecutar(new CambiarEstadoOrdenDto('en_proceso', null), $orden->id);
        $this->assertSame('en_proceso', $cambiada->estado);
        $completa = app(CambiarEstadoOrden::class)->ejecutar(new CambiarEstadoOrdenDto('completada', 1), $orden->id);
        $this->assertSame('completada', $completa->estado);
    }

    public function test_entradas_crean_el_lote_y_acumulan_sin_duplicarlo(): void
    {
        $d = $this->negocio04e();
        $action = app(RegistrarEntradaInsumo::class);
        $dto = new InsumoStockDto($d['sucursal']->id, 2, 'Nuevo', null);
        $uno = $action->ejecutar($dto, $d['insumo']->id);
        $dos = $action->ejecutar($dto, $d['insumo']->id);
        $this->assertSame($uno->id, $dos->id);
        $this->assertSame(4.0, (float) $dos->cantidad);
    }

    public function test_rollback_exterior_revierte_insumos_stock_kardex_y_orden(): void
    {
        $d = $this->negocio04e();
        DB::beginTransaction();
        try {
            app(CompletarOrden::class)->ejecutar($d['orden']->id, 1);
        } finally {
            DB::rollBack();
        }
        $this->assertSame('pendiente', $d['orden']->fresh()->estado);
        $this->assertSame(1.0, (float) $d['lote']->fresh()->cantidad);
        $this->assertSame(0, $d['stockDestino']->fresh()->stock_actual);
        $this->assertDatabaseCount('kardex', 0);
    }
}
