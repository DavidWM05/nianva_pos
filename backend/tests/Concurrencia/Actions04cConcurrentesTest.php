<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Aplicacion\Apartados\CrearApartado;
use App\Aplicacion\Apartados\RegistrarAbonoApartado;
use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Apartados\Dtos\CrearApartadoDto;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

#[Group('concurrencia')]
class Actions04cConcurrentesTest extends TestCase
{
    use PreparaArq04b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame('mysql', DB::connection()->getDriverName(), 'Concurrencia requiere MySQL real; SQLite no comprueba bloqueos.');
    }

    public function test_abonos_simultaneos_conservan_ambos_pagos_y_el_saldo_acumulado(): void
    {
        $d = $this->negocio04b();
        $d['apartado'] = Apartado::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id, 'total' => 200]);
        $this->competir($d, 'apartados', $d['apartado']->id, 'apartado_abonar', ['apartado_abonar', 'apartado_abonar']);

        $this->assertSame('100.00', $d['apartado']->fresh()->total_abonado);
        $this->assertSame(2, ApartadoAbono::where('apartado_id', $d['apartado']->id)->count());
        $this->assertSame(100.0, (float) ApartadoAbono::where('apartado_id', $d['apartado']->id)->sum('monto'));
        $this->assertSame(100.0, (float) ApartadoAbonoPago::whereHas('abono', fn ($q) => $q->where('apartado_id', $d['apartado']->id))->sum('monto'));
    }

    public function test_reembolsos_simultaneos_de_dos_unidades_conservan_stock_y_pagos(): void
    {
        $d = $this->negocio04b();
        $d['venta'] = app(RegistrarVenta::class)->ejecutar(new CrearVentaDto($d['cliente']->id, [new LineaVentaDto($d['variante']->id, 2)], [new PagoDto($d['metodo']->id, 200)], null, 0, null, null), $d['usuario']);
        $this->competir($d, 'ventas', $d['venta']->id, 'reembolso', ['reembolso', 'reembolso']);

        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
        $this->assertSame(2, Devolucion::where('venta_id', $d['venta']->id)->count());
        $this->assertSame(200.0, (float) DevolucionPago::whereHas('devolucion', fn ($q) => $q->where('venta_id', $d['venta']->id))->sum('monto'));
    }

    public function test_creaciones_simultaneas_no_reservan_dos_veces_la_ultima_unidad(): void
    {
        $d = $this->negocio04b(stockInicial: 1);
        $this->competir($d, 'inventario_stock', $d['stock']->id, 'apartado_crear', ['apartado_crear', 'stock_insuficiente']);
        $this->assertSame(0, $d['stock']->fresh()->stock_actual);
        $this->assertSame(1, Apartado::where('tenant_id', $d['tenant']->id)->count());
    }

    public function test_liquidaciones_simultaneas_generan_una_sola_venta(): void
    {
        $d = $this->conReserva();
        app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(100, [new PagoApartadoDto($d['metodo']->id, 100)], null), $d['apartado'], $d['usuario']);
        $this->competir($d, 'apartados', $d['apartado']->id, 'apartado_liquidar', ['apartado_liquidar', 'apartado_estado_invalido']);
        $this->assertSame('completado', $d['apartado']->fresh()->estado);
        $this->assertSame(9, $d['stock']->fresh()->stock_actual);
        $this->assertSame(1, Venta::where('tenant_id', $d['tenant']->id)->count());
    }

    public function test_cancelaciones_simultaneas_restituyen_la_reserva_una_vez(): void
    {
        $d = $this->conReserva();
        $this->competir($d, 'apartados', $d['apartado']->id, 'apartado_cancelar', ['apartado_cancelar', 'apartado_estado_invalido']);
        $this->assertSame('cancelado', $d['apartado']->fresh()->estado);
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
    }

    public function test_gastos_simultaneos_esperan_la_caja_y_conservan_ambos_importes(): void
    {
        $d = $this->negocio04b();
        $this->competir($d, 'caja_sesiones', $d['caja']->id, 'gasto', ['gasto', 'gasto']);
        $this->assertSame(2, Gasto::where('caja_sesion_id', $d['caja']->id)->count());
        $this->assertSame(20.0, (float) Gasto::where('caja_sesion_id', $d['caja']->id)->sum('monto'));
    }

    private function conReserva(): array
    {
        $d = $this->negocio04b();
        $d['apartado'] = app(CrearApartado::class)->ejecutar(new CrearApartadoDto($d['cliente']->id, [new LineaApartadoDto($d['variante']->id, 1)], null, null), $d['usuario']);

        return $d;
    }

    private function competir(array $d, string $tabla, int $id, string $op, array $esperados): void
    {
        $hijos = [];
        config(['database.connections.bloqueador04c' => config('database.connections.'.DB::getDefaultConnection())]);
        $bloqueador = DB::connection('bloqueador04c');
        try {
            $bloqueador->beginTransaction();
            $bloqueador->table($tabla)->where('id', $id)->lockForUpdate()->first();
            $datos = ['tenant' => $d['tenant']->id, 'sucursal' => $d['sucursal']->id, 'usuario' => $d['usuario']->id, 'cliente' => $d['cliente']->id, 'metodo' => $d['metodo']->id, 'variante' => $d['variante']->id];
            foreach (['apartado', 'venta'] as $modelo) {
                if (isset($d[$modelo])) {
                    $datos[$modelo] = $d[$modelo]->id;
                }
            }
            for ($i = 0; $i < 2; $i++) {
                $hijos[] = ProcesosConcurrentes::iniciar($op, $datos);
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
                $lecturas = array_values(array_filter($eventos, static fn (array $e): bool => ($e['bloqueo'] ?? null) === $tabla));
                $this->assertNotEmpty($lecturas);
                $this->assertTrue($lecturas[0]['for_update'], 'La Action debe leer '.$tabla.' con SELECT FOR UPDATE.');
                $this->assertGreaterThan(0, $lecturas[0]['transaccion']);
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
            DB::purge('bloqueador04c');
            app(TenantContext::class)->set($d['tenant']);
        }
    }
}
