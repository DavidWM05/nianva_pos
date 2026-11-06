<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

#[Group('concurrencia')]
class Actions04bConcurrentesTest extends TestCase
{
    use PreparaArq04b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame('mysql', DB::connection()->getDriverName(), 'El grupo concurrencia requiere MySQL real; SQLite no verifica bloqueos.');
    }

    public function test_aperturas_simultaneas_sin_sesion_abierta_crean_una_sola_caja(): void
    {
        $d = $this->negocio04b(cajaAbierta: false);
        $this->competir($d, 'sucursales', $d['sucursal']->id, 'abrir', ['abrir', 'caja_ya_abierta']);
        $this->assertSame(1, CajaSesion::where('sucursal_id', $d['sucursal']->id)->where('estado', 'abierta')->count());
    }

    public function test_cierres_simultaneos_releen_el_estado_y_solo_uno_cierra(): void
    {
        $d = $this->negocio04b();
        $this->competir($d, 'caja_sesiones', $d['caja']->id, 'cerrar', ['cerrar', 'caja_ya_cerrada']);
        $this->assertSame('cerrada', $d['caja']->fresh()->estado);
        $this->assertSame('0.00', $d['caja']->fresh()->diferencia);
    }

    public function test_dos_salidas_de_la_ultima_unidad_no_dejan_stock_negativo(): void
    {
        $d = $this->negocio04b(stockInicial: 1);
        $this->competir($d, 'inventario_stock', $d['stock']->id, 'movimiento', ['movimiento', 'stock_insuficiente']);
        $this->assertSame(0, $d['stock']->fresh()->stock_actual);
        $this->assertSame(1, Kardex::where('variante_id', $d['variante']->id)->count());
    }

    public function test_compras_simultaneas_conservan_ambas_entradas_y_sus_documentos(): void
    {
        $d = $this->negocio04b(stockInicial: 1);
        $this->competir($d, 'inventario_stock', $d['stock']->id, 'compra', ['compra', 'compra']);
        $this->assertSame(3, $d['stock']->fresh()->stock_actual);
        $this->assertSame(2, Compra::where('tenant_id', $d['tenant']->id)->count());
        $this->assertSame(2, Kardex::where('variante_id', $d['variante']->id)->count());
    }

    public function test_anulaciones_simultaneas_restituyen_la_unidad_una_sola_vez(): void
    {
        $d = $this->negocio04b();
        $d['venta'] = app(RegistrarVenta::class)->ejecutar(new CrearVentaDto($d['cliente']->id, [new LineaVentaDto($d['variante']->id, 1)], [new PagoDto($d['metodo']->id, 100)], null, 0, null, null), $d['usuario']);
        $this->competir($d, 'ventas', $d['venta']->id, 'anular', ['anular', 'venta_ya_anulada']);
        $this->assertSame(10, $d['stock']->fresh()->stock_actual);
        $this->assertSame('anulada', $d['venta']->fresh()->estado);
        $this->assertSame(2, Kardex::where('variante_id', $d['variante']->id)->count());
    }

    private function competir(array $d, string $tabla, int $id, string $operacion, array $esperados): void
    {
        $hijos = [];
        config(['database.connections.bloqueador04b' => config('database.connections.'.DB::getDefaultConnection())]);
        $bloqueador = DB::connection('bloqueador04b');
        try {
            $bloqueador->beginTransaction();
            $bloqueador->table($tabla)->where('id', $id)->lockForUpdate()->first();
            $datos = [
                'tenant' => $d['tenant']->id, 'sucursal' => $d['sucursal']->id,
                'usuario' => $d['usuario']->id, 'variante' => $d['variante']->id,
                'proveedor' => $d['proveedor']->id, 'caja' => $d['caja']->id,
            ];
            if (isset($d['venta'])) {
                $datos['venta'] = $d['venta']->id;
            }
            for ($i = 0; $i < 2; $i++) {
                $hijos[] = ProcesosConcurrentes::iniciar($operacion, $datos);
            }
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::esperarBloqueo($hijo);
            }
            $bloqueador->commit();
            $resultados = [];
            foreach ($hijos as $hijo) {
                $hijo->wait();
                $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput().$hijo->getOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                $lecturas = array_values(array_filter($eventos, static fn (array $e): bool => ($e['bloqueo'] ?? null) === $tabla));
                $this->assertNotEmpty($lecturas, 'La Action debe leer la fila protegida.');
                $this->assertTrue($lecturas[0]['for_update'], 'La Action debe leer '.$tabla.' con SELECT FOR UPDATE.');
                $this->assertGreaterThan(0, $lecturas[0]['transaccion'], 'El bloqueo debe estar dentro de la transacción.');
                if (in_array($operacion, ['anular', 'compra', 'movimiento'], true)) {
                    $stocks = array_values(array_filter($eventos, static fn (array $e): bool => isset($e['lectura_stock'])));
                    $this->assertNotEmpty($stocks, 'La Action debe leer el stock que modifica.');
                    foreach ($stocks as $lecturaStock) {
                        $this->assertTrue($lecturaStock['for_update'], 'El stock debe leerse con SELECT FOR UPDATE.');
                        $this->assertGreaterThan(0, $lecturaStock['transaccion']);
                    }
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
            DB::purge('bloqueador04b');
            app(TenantContext::class)->set($d['tenant']);
        }
    }
}
