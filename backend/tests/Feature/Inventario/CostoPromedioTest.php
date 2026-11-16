<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Aplicacion\Inventario\CargarStockInicial;
use App\Aplicacion\Inventario\RegistrarCompra;
use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Inventario\Dtos\CargaInicialInventarioDto;
use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class CostoPromedioTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    public function test_dos_compras_ponderan_costos_y_guardan_el_ultimo_sin_usarlo_como_promedio(): void
    {
        $d = $this->negocio04b(stockInicial: 0);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 10, 10)]), $d['usuario']);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 30, 20)]), $d['usuario']);
        $stock = $d['stock']->refresh();
        $this->assertSame(40, $stock->stock_actual);
        $this->assertSame('17.50', $stock->getAttribute('costo_promedio'));
        $this->assertSame('20.00', $stock->getAttribute('ultimo_costo'));
        $this->assertSame(2, Compra::count());
        $this->assertSame(2, Kardex::count());
    }

    #[DataProvider('existencias')]
    public function test_compra_con_existencia_cero_o_negativa_toma_el_costo_de_la_entrada(int $existencia): void
    {
        $d = $this->negocio04b(stockInicial: $existencia);
        $d['stock']->update(['costo_promedio' => '99.00']);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 2, 12.35)]), $d['usuario']);
        $this->assertSame('12.35', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame('12.35', $d['stock']->getAttribute('ultimo_costo'));
    }

    public static function existencias(): array
    {
        return [[0], [-1], [-4]];
    }

    public function test_compra_fraccionaria_no_redondea_el_valor_de_las_existencias_antes_del_promedio(): void
    {
        $d = $this->negocio04b(stockInicial: 0);
        $d['stock']->update(['stock_actual' => '0.001', 'costo_promedio' => '0.01']);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 0.001, 0.01)]), $d['usuario']);
        $this->assertSame('0.01', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame(0.002, $d['stock']->stock_actual);
    }

    public function test_lineas_repetidas_de_una_compra_releen_el_stock_del_modelo_ya_actualizado(): void
    {
        $d = $this->negocio04b(stockInicial: 1);
        $d['stock']->update(['costo_promedio' => '10.00']);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 1, 20), new LineaCompraDto($d['variante']->id, 2, 30)]), $d['usuario']);
        $this->assertSame('22.50', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame('30.00', $d['stock']->getAttribute('ultimo_costo'));
        $this->assertSame(4, $d['stock']->stock_actual);
    }

    public function test_salida_no_cambia_promedio_ni_ultimo_costo_aunque_reciba_un_costo(): void
    {
        $d = $this->negocio04b(stockInicial: 10);
        $d['stock']->update(['costo_promedio' => '15.00', 'ultimo_costo' => '20.00']);
        app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($d['variante']->id, $d['sucursal']->id, 'salida', 2, 'ajuste', $d['usuario']->id, costoUnitario: '99.00'));
        $this->assertSame('15.00', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame('20.00', $d['stock']->getAttribute('ultimo_costo'));
        $this->assertSame(8, $d['stock']->stock_actual);
    }

    public function test_ajuste_de_entrada_con_costo_pondera_sin_reemplazar_el_ultimo_costo_de_compra(): void
    {
        $d = $this->negocio04b(stockInicial: 10);
        $d['stock']->update(['costo_promedio' => '10.00', 'ultimo_costo' => '7.00']);
        app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($d['variante']->id, $d['sucursal']->id, 'entrada', 10, 'ajuste', $d['usuario']->id, costoUnitario: '20.00'));
        $this->assertSame('15.00', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame('7.00', $d['stock']->getAttribute('ultimo_costo'));
    }

    public function test_entrada_sin_costo_conserva_la_valoracion(): void
    {
        $d = $this->negocio04b(stockInicial: 1);
        $d['stock']->update(['costo_promedio' => '15.00', 'ultimo_costo' => '20.00']);
        app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($d['variante']->id, $d['sucursal']->id, 'entrada', 2, 'devolucion', $d['usuario']->id));
        $this->assertSame('15.00', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame('20.00', $d['stock']->getAttribute('ultimo_costo'));
    }

    #[DataProvider('costosIniciales')]
    public function test_carga_inicial_usa_costo_de_variante_o_hereda_producto(?string $costoVariante, string $esperado): void
    {
        $d = $this->negocio04b(stockInicial: 0);
        $d['producto']->update(['precio_compra' => '10.00']);
        $d['variante']->update(['costo' => $costoVariante]);
        $d['stock']->delete();
        app(CargarStockInicial::class)->ejecutar(new CargaInicialInventarioDto($d['variante']->id, $d['sucursal']->id, 3, $d['usuario']->id));
        $stock = InventarioStock::query()->where('variante_id', $d['variante']->id)->firstOrFail();
        $this->assertSame($esperado, $stock->getAttribute('costo_promedio'));
        $this->assertNull($stock->getAttribute('ultimo_costo'));
        $this->assertSame(3, $stock->stock_actual);
        $this->assertSame(1, Kardex::count());
    }

    public static function costosIniciales(): array
    {
        return [['20.00', '20.00'], [null, '10.00'], ['0.00', '0.00']];
    }

    public function test_compra_revertida_no_deja_promedio_ni_documentos_parciales(): void
    {
        $d = $this->negocio04b(stockInicial: 0);
        try {
            DB::transaction(fn () => app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 1, 20), new LineaCompraDto($d['variante']->id, 0, 40)]), $d['usuario']));
            $this->fail('La cantidad cero debe rechazar toda la compra.');
        } catch (InvalidArgumentException) {
            $this->assertSame(0, $d['stock']->refresh()->stock_actual);
            $this->assertSame('0.00', $d['stock']->getAttribute('costo_promedio'));
            $this->assertNull($d['stock']->getAttribute('ultimo_costo'));
            $this->assertSame(0, Compra::count());
            $this->assertSame(0, Kardex::count());
        }
    }

    public function test_el_promedio_es_independiente_por_sucursal(): void
    {
        $d = $this->negocio04b(stockInicial: 0);
        $otra = Sucursal::factory()->create(['tenant_id' => $d['tenant']->id]);
        $stockOtra = InventarioStock::factory()->create(['sucursal_id' => $otra->id, 'variante_id' => $d['variante']->id, 'stock_actual' => 100, 'costo_promedio' => '99.00']);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 2, 10)]), $d['usuario']);
        $this->assertSame('10.00', $d['stock']->refresh()->getAttribute('costo_promedio'));
        $this->assertSame('99.00', $stockOtra->refresh()->getAttribute('costo_promedio'));
        $this->assertSame(100, $stockOtra->stock_actual);
    }
}
