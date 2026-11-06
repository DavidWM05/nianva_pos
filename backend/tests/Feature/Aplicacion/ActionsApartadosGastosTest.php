<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\Apartados\CancelarApartado;
use App\Aplicacion\Apartados\CrearApartado;
use App\Aplicacion\Apartados\LiquidarApartado;
use App\Aplicacion\Apartados\RegistrarAbonoApartado;
use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Devoluciones\RegistrarDevolucion;
use App\Aplicacion\Gastos\RegistrarGasto;
use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Apartados\Dtos\CancelarApartadoDto;
use App\Modules\Apartados\Dtos\CrearApartadoDto;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Apartados\Dtos\LiquidarApartadoDto;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Dtos\PagoDevolucionDto;
use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class ActionsApartadosGastosTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    public function test_crear_apartado_reserva_stock_con_el_precio_del_dominio(): void
    {
        $d = $this->negocio04b();
        $apartado = app(CrearApartado::class)->ejecutar(new CrearApartadoDto($d['cliente']->id, [new LineaApartadoDto($d['variante']->id, 2)], null, null), $d['usuario']);

        $this->assertSame('200.00', $apartado->total);
        $this->assertSame(8, $d['stock']->fresh()->stock_actual);
        $this->assertSame('apartado', Kardex::sole()->motivo);
    }

    public function test_abonar_relee_el_saldo_aunque_se_reutilice_el_apartado_viejo(): void
    {
        $d = $this->negocio04b();
        $apartado = app(CrearApartado::class)->ejecutar(new CrearApartadoDto($d['cliente']->id, [new LineaApartadoDto($d['variante']->id, 1)], null, null), $d['usuario']);
        $dto = new RegistrarAbonoApartadoDto(50, [new PagoApartadoDto($d['metodo']->id, 50)], null);
        app(RegistrarAbonoApartado::class)->ejecutar($dto, $apartado, $d['usuario']);
        app(RegistrarAbonoApartado::class)->ejecutar($dto, $apartado, $d['usuario']);

        $this->assertSame('100.00', $apartado->fresh()->total_abonado);
        $this->assertSame(2, ApartadoAbono::count());
        $this->assertSame(100.0, (float) ApartadoAbono::sum('monto'));
    }

    public function test_liquidar_relee_los_abonos_y_conserva_el_stock_reservado(): void
    {
        $d = $this->negocio04b();
        $apartado = app(CrearApartado::class)->ejecutar(new CrearApartadoDto($d['cliente']->id, [new LineaApartadoDto($d['variante']->id, 1)], null, null), $d['usuario']);
        app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(100, [new PagoApartadoDto($d['metodo']->id, 100)], null), $apartado, $d['usuario']);
        $resultado = app(LiquidarApartado::class)->ejecutar(new LiquidarApartadoDto, $apartado, $d['usuario']);

        $this->assertSame('completado', $resultado->estado);
        $this->assertSame('100.00', $resultado->venta->abono_previo);
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        $this->assertSame(3, Kardex::count());
    }

    public function test_cancelar_libera_la_reserva_solo_una_vez_y_conserva_el_importe_pendiente(): void
    {
        $d = $this->negocio04b();
        $apartado = app(CrearApartado::class)->ejecutar(new CrearApartadoDto($d['cliente']->id, [new LineaApartadoDto($d['variante']->id, 1)], null, null), $d['usuario']);
        app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(40, [new PagoApartadoDto($d['metodo']->id, 40)], null), $apartado, $d['usuario']);
        $resultado = app(CancelarApartado::class)->ejecutar(new CancelarApartadoDto('Cancelación 04c'), $apartado, $d['usuario']);

        $this->assertSame(40.0, $resultado->montoAbonadoPendiente);
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
        $this->assertSame(2, Kardex::count());
        $this->expectException(ApartadoEstadoInvalidoException::class);
        app(CancelarApartado::class)->ejecutar(new CancelarApartadoDto('Repetida'), $apartado, $d['usuario']);
    }

    public function test_gasto_se_asigna_a_la_caja_activa_y_el_cierre_lo_descuenta(): void
    {
        $d = $this->negocio04b();
        $gasto = app(RegistrarGasto::class)->ejecutar(new CrearGastoDto('Luz', 30), $d['usuario']);
        $cierre = app(CerrarCaja::class)->ejecutar($d['caja'], 20);

        $this->assertSame($d['caja']->id, $gasto->caja_sesion_id);
        $this->assertSame('30.00', $gasto->monto);
        $this->assertSame('0.00', $cierre['sesion']->diferencia);
    }

    public function test_reembolso_devuelve_la_unidad_y_conserva_los_pagos_del_documento(): void
    {
        $d = $this->negocio04b();
        $venta = app(RegistrarVenta::class)->ejecutar(new CrearVentaDto($d['cliente']->id, [new LineaVentaDto($d['variante']->id, 2)], [new PagoDto($d['metodo']->id, 200)], null, 0, null, null), $d['usuario']);
        $resultado = app(RegistrarDevolucion::class)->ejecutar(new CrearDevolucionDto($venta->id, 'devolucion', [new ItemDevueltoDto($d['variante']->id, 1, false)], [], [new PagoDevolucionDto($d['metodo']->id, 100)], null, 'efectivo'), $d['usuario']);

        $this->assertSame('-100.00', $resultado['devolucion']->diferencia);
        $this->assertSame(100.0, (float) $resultado['devolucion']->pagos->sum('monto'));
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        $this->assertNull($resultado['nota_credito']);
    }
}
