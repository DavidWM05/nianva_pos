<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Aplicacion\Caja\AbrirCaja;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

#[Group('concurrencia')]
class CuadreCajaConcurrenteTest extends TestCase
{
    use PreparaArq04b;

    public function test_dos_cobros_simultaneos_suman_ambos_en_el_metodo_y_el_encabezado(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $d = $this->negocio04b(cajaAbierta: false);
        $d['metodo']->update(['tipo' => 'efectivo']);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(50), $d['usuario'], $d['terminal']);
        config(['database.connections.cuadre_bloqueador' => config('database.connections.'.DB::getDefaultConnection())]);
        $bloqueador = DB::connection('cuadre_bloqueador');
        $hijos = [];
        try {
            $bloqueador->beginTransaction();
            $bloqueador->table('caja_sesiones')->where('id', $caja->id)->lockForUpdate()->first();
            $datos = ['tenant' => $d['tenant']->id, 'usuario' => $d['usuario']->id, 'cliente' => $d['cliente']->id, 'metodo' => $d['metodo']->id, 'variante' => $d['variante']->id, 'terminal' => $d['terminal']->id];
            for ($i = 0; $i < 2; $i++) {
                $hijos[] = ProcesosConcurrentes::iniciar('venta', $datos);
            }
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::esperarBloqueo($hijo);
            }
            $bloqueador->commit();
            foreach ($hijos as $hijo) {
                $hijo->wait();
                $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput().$hijo->getOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                $this->assertSame('venta', $eventos[array_key_last($eventos)]['resultado']);
            }
            $this->assertSame('250.00', $caja->fresh()->getAttribute('saldo_teorico'));
            $this->assertSame('250.00', CajaSesionSaldo::query()->where('caja_sesion_id', $caja->id)->where('metodo_pago_id', $d['metodo']->id)->sole()->getAttribute('saldo_teorico'));
            $this->assertSame(2, CajaMovimiento::query()->where('caja_sesion_id', $caja->id)->where('tipo', 'venta')->count());
            $this->assertSame(8, $d['stock']->fresh()->stock_actual);
        } finally {
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
            if ($bloqueador->transactionLevel() > 0) {
                $bloqueador->rollBack();
            }
            DB::purge('cuadre_bloqueador');
        }
    }
}
