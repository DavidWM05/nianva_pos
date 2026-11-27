<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Aplicacion\Produccion\CompletarOrden;
use App\Aplicacion\Produccion\CrearOrdenProduccion;
use App\Aplicacion\Produccion\RegistrarTransformacion;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Produccion\Dtos\CrearOrdenProduccionDto;
use App\Modules\Produccion\Dtos\CrearTransformacionDto;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CantidadesFlujoTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas.crear', 'compras.crear', 'apartados.crear', 'apartados.abonar', 'apartados.cancelar', 'devoluciones.crear']);
        $this->seleccionarTerminalDeCaja();
        $this->variante->update(['es_granel' => true]);
        $this->actingAs($this->usuario);
    }

    public function test_vender_medio_conserva_la_fraccion_en_documento_stock_y_kardex(): void
    {
        $this->postJson('/api/v1/ventas', $this->payloadVenta([
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 0.5]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 50]],
        ]))->assertCreated()->assertJsonPath('data.detalles.0.cantidad', '0.500');
        $this->assertSame(49.5, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
        $movimiento = Kardex::where('variante_id', $this->variante->id)->latest('id')->firstOrFail();
        $this->assertSame(0.5, $movimiento->cantidad);
        $this->assertSame(49.5, $movimiento->stock_despues);
    }

    public function test_comprar_medio_incrementa_la_fraccion(): void
    {
        $this->postJson('/api/v1/compras', ['proveedor_id' => $this->proveedor->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 0.5, 'precio_compra' => 50]],
        ])->assertCreated()->assertJsonPath('data.total', '25.00');
        $this->assertDatabaseHas('compra_detalles', ['variante_id' => $this->variante->id, 'cantidad' => 0.5]);
        $this->assertSame(50.5, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
    }

    public function test_liquidar_apartado_transfiere_la_fraccion_a_la_venta(): void
    {
        $id = $this->postJson('/api/v1/apartados', ['cliente_id' => $this->cliente->ulid,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 0.5]],
        ])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/apartados/'.$id.'/abonos', ['monto' => 50, 'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 50]]])->assertOk();
        $this->patchJson('/api/v1/apartados/'.$id.'/liquidar')->assertOk();
        $this->assertDatabaseHas('venta_detalles', ['variante_id' => $this->variante->id, 'cantidad' => 0.5]);
        $this->assertSame(49.5, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
    }

    public function test_cancelar_apartado_restituye_la_fraccion(): void
    {
        $id = $this->postJson('/api/v1/apartados', ['cliente_id' => $this->cliente->ulid,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 0.5]],
        ])->assertCreated()->json('data.id');
        $datosSupervisor1 = ['motivo' => 'Prueba de fracción'];
        $this->patchJson('/api/v1/apartados/'.$id.'/cancelar', $datosSupervisor1, ['X-Autorizacion-Supervisor' => self::conSupervisor($this->usuario, AccionSupervisor::CancelarApartado, $datosSupervisor1, $id, sesionHash: hash('sha256', session()->getId()))->token])->assertOk();
        $this->assertSame(50, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
    }

    public function test_devolver_medio_restituye_el_stock_y_reembolsa_su_importe(): void
    {
        $venta = $this->crearVenta();
        $datosSupervisor1 = ['venta_id' => $venta->ulid, 'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 0.5]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 50]],
        ];
        $this->seleccionarTerminalParaPrueba((int) $this->caja->getAttribute('terminal_id'));
        $this->postJson('/api/v1/devoluciones', $datosSupervisor1, ['X-Autorizacion-Supervisor' => self::conSupervisor($this->usuario, AccionSupervisor::Reembolsar, $datosSupervisor1, $venta->ulid, sesionHash: hash('sha256', session()->getId()))->token])->assertCreated()->assertJsonPath('data.items.0.cantidad', '0.500');
        $this->assertSame(49.5, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
    }

    public function test_ajuste_por_action_descuenta_milesimas_sin_truncarlas(): void
    {
        $movimiento = app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($this->variante->id, $this->sucursal->id, 'salida', 0.001, 'ajuste', $this->usuario->id));
        $this->assertSame(0.001, $movimiento->cantidad);
        $this->assertSame(49.999, $movimiento->stock_despues);
    }

    public function test_porcentaje_se_aplica_sobre_la_base_fraccionaria_antes_de_redondear(): void
    {
        $this->assertSame('0.00', Dinero::desde('1')->multiplicarPorcentaje('0.015', '30')->aCadena());
    }

    public function test_la_variante_nace_como_pieza_y_conserva_su_unidad_base(): void
    {
        $unidad = UnidadMedida::factory()->create(['tenant_id' => $this->tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $this->producto->id, 'unidad_medida_id' => $unidad->id])->refresh();
        $this->assertFalse($variante->es_granel);
        $this->assertSame($unidad->id, $variante->unidad_medida_id);
    }

    public function test_el_ajuste_directo_rechaza_mas_de_tres_decimales(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($this->variante->id, $this->sucursal->id, 'salida', 0.0001, 'ajuste', $this->usuario->id));
    }

    public function test_devolver_mas_de_la_fraccion_vendida_conserva_el_error_de_negocio(): void
    {
        $id = $this->postJson('/api/v1/ventas', $this->payloadVenta([
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 0.5]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 50]],
        ]))->assertCreated()->json('data.id');
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $id, 'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ])->assertStatus(422)->assertJsonPath('error_code', 'devolucion_excede_cantidad_vendida')->assertJsonPath('vendido', '0.500');
    }

    public function test_transformar_fracciones_conserva_ambos_saldos(): void
    {
        $this->varianteExtra->update(['es_granel' => true]);
        $transformacion = app(RegistrarTransformacion::class)->ejecutar(new CrearTransformacionDto($this->variante->id, $this->varianteExtra->id, 0.5, 0.25, null), $this->usuario);
        $this->assertSame('0.50', $transformacion->cantidad_origen);
        $this->assertSame('0.25', $transformacion->cantidad_destino);
        $this->assertSame(49.5, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
        $this->assertSame(50.25, InventarioStock::where('variante_id', $this->varianteExtra->id)->value('stock_actual'));
    }

    public function test_produccion_cuantiza_los_insumos_antes_de_descontar_el_lote(): void
    {
        $unidad = UnidadMedida::factory()->create(['tenant_id' => $this->tenant->id]);
        $insumo = Insumo::factory()->create(['tenant_id' => $this->tenant->id, 'unidad_medida_id' => $unidad->id]);
        $receta = Receta::factory()->create(['tenant_id' => $this->tenant->id, 'variante_id' => $this->variante->id, 'rendimiento' => 1]);
        RecetaIngrediente::factory()->create(['receta_id' => $receta->id, 'insumo_id' => $insumo->id, 'unidad_medida_id' => $unidad->id, 'cantidad' => 0.001]);
        $stock = InsumoStock::factory()->create(['insumo_id' => $insumo->id, 'sucursal_id' => $this->sucursal->id, 'cantidad' => 1]);
        $orden = app(CrearOrdenProduccion::class)->ejecutar(new CrearOrdenProduccionDto($receta->id, 0.5, null, null), $this->usuario);
        app(CompletarOrden::class)->ejecutar($orden->id, 0.5);
        $this->assertSame('0.9990', $stock->fresh()->cantidad);
        $this->assertSame(50.5, InventarioStock::where('variante_id', $this->variante->id)->value('stock_actual'));
    }
}
