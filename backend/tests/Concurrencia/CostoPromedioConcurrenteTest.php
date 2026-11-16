<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Kardex;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

#[Group('concurrencia')]
class CostoPromedioConcurrenteTest extends TestCase
{
    use PreparaArq04b;

    public function test_dos_compras_simultaneas_ponderan_ambas_entradas_bajo_el_bloqueo_real(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName(), 'El promedio concurrente requiere MySQL real.');
        $d = $this->negocio04b(stockInicial: 10);
        $d['stock']->update(['costo_promedio' => '10.00', 'ultimo_costo' => '5.00']);
        config(['database.connections.bloqueadorCosto' => config('database.connections.'.DB::getDefaultConnection())]);
        $bloqueador = DB::connection('bloqueadorCosto');
        $hijos = [];
        try {
            $bloqueador->beginTransaction();
            $bloqueador->table('inventario_stock')->where('id', $d['stock']->id)->lockForUpdate()->first();
            foreach ([[4, 20], [6, 40]] as [$cantidad, $costo]) {
                $hijos[] = ProcesosConcurrentes::iniciar('compra_promedio', [
                    'tenant' => $d['tenant']->id, 'sucursal' => $d['sucursal']->id,
                    'usuario' => $d['usuario']->id, 'variante' => $d['variante']->id,
                    'proveedor' => $d['proveedor']->id, 'cantidad' => $cantidad, 'costo' => $costo,
                ]);
            }
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::esperarBloqueo($hijo);
            }
            $bloqueador->commit();
            foreach ($hijos as $hijo) {
                $hijo->wait();
                $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput().$hijo->getOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                $lecturas = array_values(array_filter($eventos, static fn (array $evento): bool => isset($evento['lectura_stock'])));
                $this->assertNotEmpty($lecturas);
                $this->assertTrue($lecturas[0]['for_update'], 'La lectura del promedio debe ejecutar SELECT FOR UPDATE.');
                $this->assertGreaterThan(0, $lecturas[0]['transaccion']);
                $this->assertSame('compra_promedio', $eventos[array_key_last($eventos)]['resultado']);
            }
            $stock = $d['stock']->refresh();
            $this->assertSame(20, $stock->stock_actual);
            $this->assertSame('21.00', $stock->getAttribute('costo_promedio'));
            $this->assertContains($stock->getAttribute('ultimo_costo'), ['20.00', '40.00']);
            $this->assertSame(2, Compra::where('tenant_id', $d['tenant']->id)->count());
            $this->assertSame(2, Kardex::where('variante_id', $d['variante']->id)->count());
        } finally {
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
            if ($bloqueador->transactionLevel() > 0) {
                $bloqueador->rollBack();
            }
            DB::purge('bloqueadorCosto');
        }
    }
}
