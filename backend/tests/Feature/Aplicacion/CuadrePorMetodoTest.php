<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\Apartados\RegistrarAbonoApartado;
use App\Aplicacion\Devoluciones\RegistrarDevolucion;
use App\Aplicacion\GiftCards\RecargarGiftCard;
use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Dtos\ItemNuevoDto;
use App\Modules\Devoluciones\Dtos\PagoDevolucionDto;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\GiftCards\Exceptions\RecargaPagoNoCuadraException;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use App\Modules\Tpv\Models\Venta;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class CuadrePorMetodoTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    public function test_abono_monetario_sin_caja_rechaza_con_el_error_de_ventas_y_no_cobra(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $d['metodo']->update(['tipo' => 'efectivo']);
        $apartado = Apartado::factory()->create([
            'tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id,
            'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id,
        ]);
        $dto = new RegistrarAbonoApartadoDto(50, [new PagoApartadoDto($d['metodo']->id, 50)], null);

        $this->rechazaSinCaja(fn () => app(RegistrarAbonoApartado::class)->ejecutar($dto, $apartado, $d['usuario']));

        $this->assertSame('0.00', $apartado->fresh()->total_abonado);
        $this->assertSame(0, ApartadoAbono::query()->count());
    }

    public function test_recarga_monetaria_sin_caja_rechaza_con_el_error_de_ventas_y_conserva_saldo(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $d['metodo']->update(['tipo' => 'efectivo']);
        $tarjeta = GiftCard::factory()->create(['tenant_id' => $d['tenant']->id, 'cliente_id' => $d['cliente']->id]);
        $dto = new RecargarGiftCardDto(50, [new PagoDto($d['metodo']->id, 50)]);

        $this->rechazaSinCaja(fn () => app(RecargarGiftCard::class)->ejecutar($dto, $tarjeta->id, $d['usuario']));

        $this->assertSame('100.00', $tarjeta->fresh()->saldo_actual);
        $this->assertSame(0, GiftCardRecarga::query()->count());
    }

    public function test_reembolso_monetario_sin_caja_rechaza_con_el_error_de_ventas_y_no_devuelve_stock(): void
    {
        $d = $this->negocio04b();
        $d['metodo']->update(['tipo' => 'efectivo']);
        $venta = $this->vender($d);
        $d['caja']->update(['estado' => 'cerrada']);
        $dto = new CrearDevolucionDto($venta->id, 'devolucion', [new ItemDevueltoDto($d['variante']->id, 1, false)], [], [new PagoDevolucionDto($d['metodo']->id, 100)], null, 'efectivo');

        $this->rechazaSinCaja(fn () => app(RegistrarDevolucion::class)->ejecutar($dto, $d['usuario']));

        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        $this->assertSame(0, Devolucion::query()->count());
    }

    public function test_nota_de_credito_sin_caja_no_exige_reembolso_monetario_ni_mueve_el_libro(): void
    {
        $d = $this->negocio04b();
        $d['metodo']->update(['tipo' => 'efectivo']);
        $venta = $this->vender($d);
        $d['caja']->update(['estado' => 'cerrada']);
        $antes = CajaMovimiento::query()->count();
        $dto = new CrearDevolucionDto($venta->id, 'devolucion', [new ItemDevueltoDto($d['variante']->id, 1, false)], [], [], null, 'nota_credito');

        $resultado = app(RegistrarDevolucion::class)->ejecutar($dto, $d['usuario']);

        $this->assertNotNull($resultado['nota_credito']);
        $this->assertSame('100.00', $resultado['nota_credito']->monto_original);
        $this->assertSame($antes, CajaMovimiento::query()->count());
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
    }

    public function test_el_pago_de_una_venta_guarda_su_metodo_en_el_libro(): void
    {
        $d = $this->negocio04b();
        $venta = $this->vender($d);
        $movimiento = CajaMovimiento::query()->where('tipo', 'venta')->where('referencia_id', $venta->id)->sole();

        $this->assertArrayHasKey('metodo_pago_id', $movimiento->getAttributes());
        $this->assertSame($d['metodo']->id, $movimiento->getAttribute('metodo_pago_id'));
    }

    private function vender(array $d): Venta
    {
        return app(RegistrarVenta::class)->ejecutar(new CrearVentaDto($d['cliente']->id, [new LineaVentaDto($d['variante']->id, 1)], [new PagoDto($d['metodo']->id, 100)], null, 0, null, null), $d['usuario']);
    }

    private function rechazaSinCaja(Closure $operacion): void
    {
        try {
            $operacion();
            $this->fail('La operación monetaria sin caja abierta debe rechazarse.');
        } catch (CajaSesionNoAbiertaException $error) {
            $this->assertSame('caja_no_abierta', $error->errorCode());
        }
    }

    public function test_abono_solo_con_nota_de_credito_no_exige_caja_ni_escribe_el_libro(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $metodo = MetodoPago::factory()->global()->create(['nombre' => 'Nota de Crédito', 'tipo' => 'digital']);
        $apartado = Apartado::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id]);
        app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(50, [new PagoApartadoDto($metodo->id, 50)], null), $apartado, $d['usuario']);
        $this->assertSame('50.00', $apartado->fresh()->total_abonado);
        $this->assertSame(0, CajaMovimiento::query()->count());
    }

    public function test_recarga_rechaza_pagos_que_no_cuadran_sin_cambiar_la_tarjeta(): void
    {
        $d = $this->negocio04b();
        $tarjeta = GiftCard::factory()->create(['tenant_id' => $d['tenant']->id, 'cliente_id' => $d['cliente']->id]);
        try {
            app(RecargarGiftCard::class)->ejecutar(new RecargarGiftCardDto(50, [new PagoDto($d['metodo']->id, 49)]), $tarjeta->id, $d['usuario']);
            $this->fail('La recarga debe rechazar pagos que no cuadran.');
        } catch (RecargaPagoNoCuadraException $error) {
            $this->assertSame('recarga_pago_no_cuadra', $error->errorCode());
        }
        $this->assertSame('100.00', $tarjeta->fresh()->saldo_actual);
        $this->assertSame(0, GiftCardRecarga::query()->count());
    }

    public function test_reembolso_mixto_solo_resta_del_libro_el_metodo_monetario(): void
    {
        $d = $this->negocio04b();
        $venta = $this->vender($d);
        $metodo = MetodoPago::factory()->global()->create(['nombre' => 'Nota de Crédito', 'tipo' => 'digital']);
        $resultado = app(RegistrarDevolucion::class)->ejecutar(new CrearDevolucionDto($venta->id, 'devolucion', [new ItemDevueltoDto($d['variante']->id, 1, false)], [], [new PagoDevolucionDto($d['metodo']->id, 40), new PagoDevolucionDto($metodo->id, 60)], null, 'efectivo'), $d['usuario']);
        $filas = CajaMovimiento::query()->where('referencia_tabla', 'devoluciones')->where('referencia_id', $resultado['devolucion']->id)->get();
        $this->assertCount(1, $filas);
        $this->assertSame('-40.00', $filas->sole()->getAttribute('monto'));
        $this->assertSame($d['metodo']->id, $filas->sole()->getAttribute('metodo_pago_id'));
        $this->assertSame('110.00', $d['caja']->fresh()->getAttribute('saldo_teorico'));
    }

    public function test_abono_mixto_incrementa_la_proyeccion_de_cada_metodo_y_vincula_la_caja(): void
    {
        $d = $this->negocio04b();
        $d['metodo']->update(['tipo' => 'efectivo']);
        $tarjeta = MetodoPago::factory()->create(['tenant_id' => $d['tenant']->id, 'nombre' => 'Tarjeta', 'tipo' => 'tarjeta']);
        $apartado = Apartado::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id, 'total' => 100]);
        $abono = app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(50, [new PagoApartadoDto($d['metodo']->id, 20), new PagoApartadoDto($tarjeta->id, 30)], null), $apartado, $d['usuario']);
        $this->assertSame($d['caja']->id, $abono->getAttribute('caja_sesion_id'));
        $this->assertSame('100.00', $d['caja']->fresh()->getAttribute('saldo_teorico'));
        $saldos = CajaSesionSaldo::query()->where('caja_sesion_id', $d['caja']->id)->get()->keyBy('metodo_pago_id');
        $this->assertSame('70.00', $saldos[$d['metodo']->id]->getAttribute('saldo_teorico'));
        $this->assertSame('30.00', $saldos[$tarjeta->id]->getAttribute('saldo_teorico'));
        $this->assertSame(2, CajaMovimiento::query()->where('caja_sesion_id', $d['caja']->id)->where('tipo', 'abono_apartado')->count());
    }

    public function test_cambio_sin_diferencia_monetaria_no_exige_caja_abierta(): void
    {
        $d = $this->negocio04b();
        $venta = $this->vender($d);
        $d['caja']->update(['estado' => 'cerrada']);
        $antes = CajaMovimiento::query()->count();
        $dto = new CrearDevolucionDto($venta->id, 'cambio', [new ItemDevueltoDto($d['variante']->id, 1, false)], [new ItemNuevoDto($d['variante']->id, 1)], [], null, 'efectivo');
        $resultado = app(RegistrarDevolucion::class)->ejecutar($dto, $d['usuario']);
        $this->assertSame('0.00', $resultado['devolucion']->getAttribute('diferencia'));
        $this->assertNull($resultado['devolucion']->getAttribute('caja_sesion_id'));
        $this->assertSame($antes, CajaMovimiento::query()->count());
    }

    public function test_la_sombra_del_cambio_sigue_ligada_a_la_caja_abierta(): void
    {
        $d = $this->negocio04b();
        $venta = $this->vender($d);
        $dto = new CrearDevolucionDto($venta->id, 'cambio', [new ItemDevueltoDto($d['variante']->id, 1, false)], [new ItemNuevoDto($d['variante']->id, 1)], [], null, 'efectivo');
        $resultado = app(RegistrarDevolucion::class)->ejecutar($dto, $d['usuario']);
        $sombra = Venta::query()->findOrFail($resultado['devolucion']->getAttribute('venta_sombra_id'));
        $this->assertSame($d['caja']->id, $sombra->getAttribute('caja_sesion_id'));
    }

    public function test_un_cambio_con_diferencia_sin_caja_rechaza_y_no_escribe_sombra(): void
    {
        foreach ([50, 150] as $precio) {
            $d = $this->negocio04b();
            $venta = $this->vender($d);
            $d['caja']->update(['estado' => 'cerrada']);
            $d['producto']->update(['precio_venta' => $precio]);
            $dto = new CrearDevolucionDto($venta->id, 'cambio', [new ItemDevueltoDto($d['variante']->id, 1, false)], [new ItemNuevoDto($d['variante']->id, 1)], [new PagoDevolucionDto($d['metodo']->id, 50)], null, 'efectivo');
            $this->rechazaSinCaja(fn () => app(RegistrarDevolucion::class)->ejecutar($dto, $d['usuario']));
            $this->assertSame(0, Venta::query()->where('tenant_id', $d['tenant']->id)->where('es_venta_sombra', true)->count());
            $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        }
    }

    public function test_cambio_con_diferencia_aun_con_nota_de_credito_exige_caja(): void
    {
        $d = $this->negocio04b();
        $venta = $this->vender($d);
        $d['caja']->update(['estado' => 'cerrada']);
        $d['producto']->update(['precio_venta' => 50]);
        $dto = new CrearDevolucionDto($venta->id, 'cambio', [new ItemDevueltoDto($d['variante']->id, 1, false)], [new ItemNuevoDto($d['variante']->id, 1)], [], null, 'nota_credito');
        $this->rechazaSinCaja(fn () => app(RegistrarDevolucion::class)->ejecutar($dto, $d['usuario']));
        $this->assertSame(0, Venta::query()->where('tenant_id', $d['tenant']->id)->where('es_venta_sombra', true)->count());
    }
}
