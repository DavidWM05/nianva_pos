<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\Caja\AbrirCaja;
use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Inventario\RegistrarCompra;
use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Aplicacion\Ventas\AnularVenta;
use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Dtos\AnularVentaDto;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Exceptions\CajaYaCerradaException;
use App\Modules\Tpv\Exceptions\VentaYaAnuladaException;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class ActionsTpvInventarioTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    public function test_abrir_caja_crea_una_sesion_con_el_fondo_y_la_sucursal_del_usuario(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(125), $d['usuario']);

        $this->assertSame('abierta', $caja->estado);
        $this->assertSame('125.00', $caja->monto_apertura);
        $this->assertSame($d['sucursal']->id, $caja->sucursal_id);
        $this->assertSame(1, CajaSesion::where('estado', 'abierta')->count());
    }

    public function test_movimiento_reutiliza_la_transaccion_y_conserva_stock_y_kardex_juntos(): void
    {
        $d = $this->negocio04b();
        $nivel = DB::transactionLevel();
        $kardex = app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($d['variante']->id, $d['sucursal']->id, 'entrada', 3, 'ajuste', $d['usuario']->id));

        $this->assertSame($nivel, DB::transactionLevel());
        $this->assertSame(13, $d['stock']->fresh()->stock_actual);
        $this->assertSame(13, $kardex->stock_resultante);
        $this->assertSame('ajuste', $kardex->motivo);
    }

    public function test_compra_con_dos_lineas_de_la_misma_variante_no_pierde_ninguna_entrada(): void
    {
        $d = $this->negocio04b();
        $compra = app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, 'COMPRA-04B', [
            new LineaCompraDto($d['variante']->id, 2, 35),
            new LineaCompraDto($d['variante']->id, 3, 40),
        ]), $d['usuario']);

        $this->assertSame('190.00', $compra->total);
        $this->assertCount(2, $compra->detalles);
        $this->assertSame(15, $d['stock']->fresh()->stock_actual);
        $this->assertSame(2, Kardex::where('referencia_tabla', 'compras')->where('referencia_id', $compra->id)->count());
    }

    public function test_anular_venta_restituye_stock_una_vez_aunque_se_reutilice_el_modelo_viejo(): void
    {
        $d = $this->negocio04b();
        $venta = app(RegistrarVenta::class)->ejecutar(new CrearVentaDto($d['cliente']->id, [new LineaVentaDto($d['variante']->id, 1)], [new PagoDto($d['metodo']->id, 100)], null, 0, null, null), $d['usuario']);
        $resultado = app(AnularVenta::class)->ejecutar(new AnularVentaDto('Revisión 04b'), $venta, $d['usuario']);

        $this->assertSame('anulada', $resultado->estado);
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
        $this->assertSame(2, Kardex::count());
        $this->expectException(VentaYaAnuladaException::class);
        app(AnularVenta::class)->ejecutar(new AnularVentaDto('Repetida'), $venta, $d['usuario']);
    }

    public function test_cerrar_caja_relee_el_estado_en_lugar_de_confiar_en_un_modelo_viejo(): void
    {
        $d = $this->negocio04b();
        app(CerrarCaja::class)->ejecutar($d['caja'], 50);

        $this->expectException(CajaYaCerradaException::class);
        app(CerrarCaja::class)->ejecutar($d['caja'], 999);
    }

    public function test_movimiento_crea_y_bloquea_el_stock_si_la_fila_no_existia(): void
    {
        $d = $this->negocio04b();
        $d['stock']->delete();
        $kardex = app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($d['variante']->id, $d['sucursal']->id, 'entrada', 3, 'ajuste', $d['usuario']->id));

        $this->assertSame(3, $kardex->stock_resultante);
        $this->assertDatabaseHas('inventario_stock', ['variante_id' => $d['variante']->id, 'sucursal_id' => $d['sucursal']->id, 'stock_actual' => 3]);
    }

    public function test_compra_compuesta_revierte_documento_y_stock_con_la_transaccion_del_llamador(): void
    {
        $d = $this->negocio04b();
        $dto = new CompraDto($d['proveedor']->id, null, [
            new LineaCompraDto($d['variante']->id, 2, 35),
            new LineaCompraDto($d['variante']->id, 0, 40),
        ]);
        try {
            DB::transaction(fn () => app(RegistrarCompra::class)->ejecutar($dto, $d['usuario']));
            $this->fail('La segunda línea inválida debe revertir el caso de uso.');
        } catch (\InvalidArgumentException $excepcion) {
            $this->assertSame('La cantidad debe ser mayor a cero.', $excepcion->getMessage());
        }

        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
        $this->assertDatabaseCount('compras', 0);
        $this->assertDatabaseCount('compra_detalles', 0);
        $this->assertSame(0, Kardex::count());
    }
}
