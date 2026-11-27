<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\Caja\AbrirCaja;
use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Devoluciones\RegistrarDevolucion;
use App\Aplicacion\Gastos\RegistrarGasto;
use App\Aplicacion\Libros\ConciliarLibros;
use App\Aplicacion\Ventas\AnularVenta;
use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Dtos\PagoDevolucionDto;
use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Dtos\AnularVentaDto;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Exceptions\AnulacionRequiereDevolucionException;
use App\Modules\Tpv\Exceptions\ConteoMetodoFaltanteException;
use App\Modules\Tpv\Models\CajaCierreMetodo;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class CierrePorMetodoTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaArq04b;
    use RefreshDatabase;

    private function actor(): array
    {
        $d = $this->negocio04b();
        $d['metodo'] = MetodoPago::sinTenant()->findOrFail(MetodoEfectivo::id());
        $d['tarjeta'] = MetodoPago::factory()->create(['tenant_id' => $d['tenant']->id, 'nombre' => 'Tarjeta', 'tipo' => 'tarjeta']);

        return $d;
    }

    private function vender(array $d, bool $mixta = false): Venta
    {
        $pagos = $mixta ? [new PagoDto($d['metodo']->id, 40), new PagoDto($d['tarjeta']->id, 60)] : [new PagoDto($d['metodo']->id, 100)];

        return app(RegistrarVenta::class)->ejecutar(new CrearVentaDto($d['cliente']->id, [new LineaVentaDto($d['variante']->id, 1)], $pagos, null, 0, null, null), $d['usuario'], terminal: $d['terminal']);
    }

    public function test_efectivo_y_tarjeta_cuadran_por_separado_y_el_encabezado_suma_los_metodos(): void
    {
        $d = $this->actor();
        $this->vender($d, true);
        $cierre = app(CerrarCaja::class)->ejecutar($d['caja'], [['metodo_pago_id' => $d['metodo']->id, 'monto' => 90], ['metodo_pago_id' => $d['tarjeta']->id, 'monto' => 60]]);

        $this->assertSame('150.00', $cierre['sesion']->monto_cierre);
        $this->assertSame('150.00', $cierre['sesion']->getAttribute('total_teorico'));
        $this->assertSame('0.00', $cierre['sesion']->diferencia);
        $filas = CajaCierreMetodo::query()->where('caja_sesion_id', $d['caja']->id)->get()->keyBy('metodo_pago_id');
        $this->assertSame('90.00', $filas[$d['metodo']->id]->getAttribute('total_teorico'));
        $this->assertSame('60.00', $filas[$d['tarjeta']->id]->getAttribute('total_teorico'));
        $this->assertSame('0.00', $filas[$d['tarjeta']->id]->getAttribute('diferencia'));
    }

    public function test_falta_de_conteo_de_un_metodo_con_movimientos_rechaza_el_cierre(): void
    {
        $d = $this->actor();
        $this->vender($d, true);
        $this->expectException(ConteoMetodoFaltanteException::class);
        app(CerrarCaja::class)->ejecutar($d['caja'], [['metodo_pago_id' => $d['metodo']->id, 'monto' => 90]]);
    }

    public function test_un_conteo_sin_movimientos_tiene_teorico_cero(): void
    {
        $d = $this->actor();
        app(CerrarCaja::class)->ejecutar($d['caja'], [['metodo_pago_id' => $d['metodo']->id, 'monto' => 50], ['metodo_pago_id' => $d['tarjeta']->id, 'monto' => 7]]);
        $fila = CajaCierreMetodo::query()->where('caja_sesion_id', $d['caja']->id)->where('metodo_pago_id', $d['tarjeta']->id)->sole();

        $this->assertSame('0.00', $fila->getAttribute('total_teorico'));
        $this->assertSame('7.00', $fila->getAttribute('monto_contado'));
        $this->assertSame('7.00', $fila->getAttribute('diferencia'));
    }

    public function test_anular_despues_del_corte_se_rechaza_aunque_haya_caja_actual(): void
    {
        $d = $this->actor();
        $venta = $this->vender($d);
        $cerrada = app(CerrarCaja::class)->ejecutar($d['caja'], [['metodo_pago_id' => $d['metodo']->id, 'monto' => 150]])['sesion'];
        $actual = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(20), $d['usuario'], $d['terminal']);
        try {
            app(AnularVenta::class)->ejecutar(new AnularVentaDto('Anulación tardía'), $venta, $d['usuario'], self::conSupervisor($d['usuario'], AccionSupervisor::AnularVenta, [], $venta->ulid));
            $this->fail('Una venta de una caja cortada requiere devolución.');
        } catch (AnulacionRequiereDevolucionException $error) {
            $this->assertSame('anulacion_requiere_devolucion', $error->errorCode());
        }

        $this->assertSame('150.00', $cerrada->fresh()->getAttribute('saldo_teorico'));
        $this->assertSame('150.00', $cerrada->fresh()->monto_cierre);
        $this->assertSame('0.00', $cerrada->fresh()->diferencia);
        $this->assertSame('20.00', $actual->fresh()->getAttribute('saldo_teorico'));
        $this->assertSame('completada', $venta->fresh()->estado);
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
    }

    public function test_anulacion_tardia_sin_caja_actual_rechaza_sin_tocar_la_venta(): void
    {
        $d = $this->actor();
        $venta = $this->vender($d);
        app(CerrarCaja::class)->ejecutar($d['caja'], [['metodo_pago_id' => $d['metodo']->id, 'monto' => 150]]);
        try {
            app(AnularVenta::class)->ejecutar(new AnularVentaDto('Sin caja actual'), $venta, $d['usuario']);
            $this->fail('Una venta de una caja cortada requiere devolución.');
        } catch (AnulacionRequiereDevolucionException $error) {
            $this->assertSame('anulacion_requiere_devolucion', $error->errorCode());
        }
        $this->assertSame('completada', $venta->fresh()->estado);
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
    }

    public function test_reembolso_despues_del_corte_usa_la_terminal_operadora(): void
    {
        $d = $this->actor();
        $venta = $this->vender($d);
        $cerrada = app(CerrarCaja::class)->ejecutar($d['caja'], [['metodo_pago_id' => $d['metodo']->id, 'monto' => 150]])['sesion'];

        $terminal = Terminal::factory()->create(['sucursal_id' => $d['sucursal']->id]);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(120), $d['usuario'], $terminal);
        $otraTerminal = Terminal::factory()->create(['sucursal_id' => $d['sucursal']->id]);
        $otraCaja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(120), $d['usuario'], $otraTerminal);

        $dto = new CrearDevolucionDto($venta->id, 'devolucion', [
            new ItemDevueltoDto($d['variante']->id, 1, false),
        ], [], [new PagoDevolucionDto($d['metodo']->id, 100)], null, 'efectivo');
        $resultado = app(RegistrarDevolucion::class)->ejecutar(
            $dto, $d['usuario'], self::conSupervisor($d['usuario'], AccionSupervisor::Reembolsar, [], $venta->ulid), $terminal,
        );

        $this->assertSame($venta->id, (int) $resultado['devolucion']->getAttribute('venta_id'));
        $this->assertSame($caja->id, (int) $resultado['devolucion']->getAttribute('caja_sesion_id'));
        $this->assertSame('20.00', $caja->fresh()->getAttribute('saldo_teorico'));
        $this->assertSame('120.00', $otraCaja->fresh()->getAttribute('saldo_teorico'));
        $this->assertSame('150.00', $cerrada->fresh()->getAttribute('saldo_teorico'));
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
    }

    public function test_conciliar_detecta_una_proyeccion_incorrecta_de_un_metodo(): void
    {
        $d = $this->actor();
        $this->vender($d, true);
        CajaSesionSaldo::query()->where('caja_sesion_id', $d['caja']->id)->where('metodo_pago_id', $d['tarjeta']->id)->update(['saldo_teorico' => '61.00']);
        $hallazgos = implode("\n", app(ConciliarLibros::class)->ejecutar());

        $this->assertStringContainsString('método '.$d['tarjeta']->id, $hallazgos);
        $this->assertStringContainsString('61.00', $hallazgos);
    }

    public function test_efectivo_del_tenant_reune_apertura_gasto_y_venta_en_un_solo_renglon_del_corte(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $d['metodo']->update(['tipo' => 'tarjeta']);
        $local = MetodoPago::factory()->create(['tenant_id' => $d['tenant']->id, 'nombre' => 'Caja principal', 'tipo' => 'efectivo']);
        $this->assertTrue(MetodoPago::sinTenant()->whereNull('tenant_id')->where('nombre', 'Efectivo')->exists());
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(50), $d['usuario'], $d['terminal']);
        app(RegistrarGasto::class)->ejecutar(new CrearGastoDto('Luz', 30), $d['usuario'], $d['terminal']);
        $d['metodo'] = $local;
        $this->vender($d);

        $ids = CajaMovimiento::query()->where('caja_sesion_id', $caja->id)->orderBy('id')->pluck('metodo_pago_id')->unique()->values()->all();
        $this->assertSame([$local->id], $ids);
        $this->assertSame(1, CajaSesionSaldo::query()->where('caja_sesion_id', $caja->id)->count());
        $cerrada = app(CerrarCaja::class)->ejecutar($caja, [['metodo_pago_id' => $local->id, 'monto' => 120]])['sesion'];
        $this->assertSame('120.00', $cerrada->monto_cierre);
        $this->assertSame('120.00', $cerrada->getAttribute('total_teorico'));
        $this->assertSame('0.00', $cerrada->diferencia);
        $this->assertSame(1, CajaCierreMetodo::query()->where('caja_sesion_id', $caja->id)->count());
    }

    public function test_cerrar_no_repite_el_fondo_si_se_configura_otro_efectivo_despues_de_abrir(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $d['metodo']->update(['tipo' => 'tarjeta']);
        $globalId = MetodoEfectivo::id();
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(50), $d['usuario'], $d['terminal']);
        MetodoPago::factory()->create(['tenant_id' => $d['tenant']->id, 'nombre' => 'Fondo nuevo', 'tipo' => 'efectivo']);
        $cerrada = app(CerrarCaja::class)->ejecutar($caja, [['metodo_pago_id' => $globalId, 'monto' => 50]])['sesion'];
        $this->assertSame('50.00', $cerrada->getAttribute('total_teorico'));
        $this->assertSame('0.00', $cerrada->diferencia);
        $this->assertSame(1, CajaMovimiento::query()->where('caja_sesion_id', $caja->id)->where('tipo', 'saldo_inicial')->count());
    }
}
