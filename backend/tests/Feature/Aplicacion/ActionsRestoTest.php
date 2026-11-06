<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Aplicacion\Cotizaciones\ActualizarCotizacion;
use App\Aplicacion\Cotizaciones\AnularCotizacion;
use App\Aplicacion\Cotizaciones\ConvertirCotizacion;
use App\Aplicacion\Cotizaciones\CrearCotizacion;
use App\Aplicacion\Inventario\RegistrarCompra;
use App\Aplicacion\Nucleo\ResetearDosFactor;
use App\Aplicacion\UnidadesMedida\ActualizarUnidadMedida;
use App\Aplicacion\UnidadesMedida\CrearUnidadMedida;
use App\Aplicacion\UnidadesMedida\EliminarUnidadMedida;
use App\Modules\Cotizaciones\Dtos\ActualizarCotizacionDto;
use App\Modules\Cotizaciones\Dtos\ConvertirCotizacionDto;
use App\Modules\Cotizaciones\Dtos\CrearCotizacionDto;
use App\Modules\Cotizaciones\Dtos\LineaCotizacionDto;
use App\Modules\Cotizaciones\Exceptions\CotizacionNoEditableException;
use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Nucleo\Exceptions\SucursalNoPermitidaException;
use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\UnidadesMedida\Dtos\UnidadMedidaDto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\PreparaArq04e;
use Tests\TestCase;

class ActionsRestoTest extends TestCase
{
    use PreparaArq04e;
    use RefreshDatabase;

    public function test_crear_cotizacion_no_mueve_stock(): void
    {
        $d = $this->negocio04e();
        $cotizacion = app(CrearCotizacion::class)->ejecutar(new CrearCotizacionDto($d['cliente']->id, $d['sucursal']->id, 15, 0, null, null, [new LineaCotizacionDto($d['variante']->id, 2, 100, 0)]), $d['usuario']);
        $this->assertSame(200.0, (float) $cotizacion->total);
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
        $this->assertDatabaseCount('kardex', 0);
    }

    public function test_actualizar_y_anular_cotizacion_bloquean_el_estado_actual(): void
    {
        $d = $this->negocio04e();
        $actualizada = app(ActualizarCotizacion::class)->ejecutar(new ActualizarCotizacionDto(null, null, null, null, null, [new LineaCotizacionDto($d['variante']->id, 3, 100, 0)], []), $d['cotizacion']->id);
        $this->assertSame(300.0, (float) $actualizada->total);
        app(AnularCotizacion::class)->ejecutar($actualizada->id);
        $this->assertSame('anulada', $actualizada->fresh()->estado);
        $this->expectException(CotizacionNoEditableException::class);
        app(ActualizarCotizacion::class)->ejecutar(new ActualizarCotizacionDto(null, null, null, null, null, [], []), $actualizada->id);
    }

    public function test_convertir_cotizacion_usa_el_precio_autoritativo_y_descontar_stock(): void
    {
        $d = $this->negocio04e();
        $d['cotizacion']->update(['total' => 1]);
        $venta = app(ConvertirCotizacion::class)->ejecutar(new ConvertirCotizacionDto($d['metodo']->id), $d['cotizacion']->id, $d['usuario']);
        $this->assertSame(100.0, (float) $venta->total);
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        $this->assertSame($venta->id, $d['cotizacion']->fresh()->venta_id);
    }

    public function test_conversion_sin_stock_revierte_venta_y_estado_de_cotizacion(): void
    {
        $d = $this->negocio04e();
        $d['stock']->update(['stock_actual' => 0]);
        try {
            DB::transaction(fn () => app(ConvertirCotizacion::class)->ejecutar(new ConvertirCotizacionDto($d['metodo']->id), $d['cotizacion']->id, $d['usuario']));
            $this->fail('Se esperaba stock insuficiente.');
        } catch (StockInsuficienteException) {
            $this->assertSame('pendiente', $d['cotizacion']->fresh()->estado);
            $this->assertDatabaseCount('ventas', 0);
            $this->assertDatabaseCount('kardex', 0);
        }
    }

    public function test_crear_actualizar_y_eliminar_unidad_de_medida(): void
    {
        $d = $this->negocio04e();
        $unidad = app(CrearUnidadMedida::class)->ejecutar(new UnidadMedidaDto('Paquete', 'paq', 'entero', null, ['nombre', 'abreviatura', 'tipo']), $d['tenant']->id);
        $this->assertSame('Paquete', $unidad->nombre);
        $actualizada = app(ActualizarUnidadMedida::class)->ejecutar(new UnidadMedidaDto('Caja', null, null, null, ['nombre']), $unidad->id);
        $this->assertSame('Caja', $actualizada->nombre);
        app(EliminarUnidadMedida::class)->ejecutar($unidad->id);
        $this->assertModelMissing($unidad);
    }

    public function test_resetear_2fa_revoca_dispositivos_y_sesiones_en_la_misma_transaccion(): void
    {
        $d = $this->negocio04e();
        $d['usuario']->forceFill(['two_factor_secret' => 'SECRETO', 'two_factor_recovery_codes' => ['RECUPERACION'], 'two_factor_confirmed_at' => now()])->save();
        DispositivoConfiable::factory()->create(['usuario_id' => $d['usuario']->id]);
        config(['session.driver' => 'database']);
        DB::table('sessions')->insert(['id' => 'sesion-04e', 'user_id' => $d['usuario']->id, 'payload' => '', 'last_activity' => time()]);
        app(ResetearDosFactor::class)->ejecutar($d['usuario']->id);
        $this->assertNull($d['usuario']->fresh()->two_factor_secret);
        $this->assertNull($d['usuario']->fresh()->two_factor_recovery_codes);
        $this->assertNull($d['usuario']->fresh()->two_factor_confirmed_at);
        $this->assertDatabaseCount('dispositivos_confiables', 0);
        $this->assertDatabaseCount('sessions', 0);
    }

    public function test_compra_no_acepta_otra_sucursal_sin_permiso(): void
    {
        $d = $this->negocio04e();
        $otra = Sucursal::factory()->create(['tenant_id' => $d['tenant']->id]);
        $this->expectException(SucursalNoPermitidaException::class);
        app(RegistrarCompra::class)->ejecutar(new CompraDto($d['proveedor']->id, null, [new LineaCompraDto($d['variante']->id, 1, 10)], $otra->id), $d['usuario']);
    }
}
