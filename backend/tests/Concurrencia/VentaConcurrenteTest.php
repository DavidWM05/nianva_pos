<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('concurrencia')]
class VentaConcurrenteTest extends TestCase
{
    public function test_dos_ventas_de_la_ultima_unidad_esperan_el_bloqueo_y_solo_una_se_confirma(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName(), 'El grupo concurrencia requiere MySQL real; SQLite no verifica bloqueos.');
        // Sin RefreshDatabase: los hijos necesitan ver los fixtures ya confirmados.
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $hijos = [];
        $bloqueador = null;
        try {
            $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
            $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
            $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
            $metodo = MetodoPago::factory()->create(['tenant_id' => $tenant->id]);
            $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => 100]);
            $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
            $stock = InventarioStock::factory()->create(['sucursal_id' => $sucursal->id, 'variante_id' => $variante->id, 'stock_actual' => 1]);
            CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id]);
            config(['database.connections.bloqueador' => config('database.connections.'.DB::getDefaultConnection())]);
            $bloqueador = DB::connection('bloqueador');
            $bloqueador->beginTransaction();
            $bloqueador->table('inventario_stock')->where('id', $stock->id)->lockForUpdate()->first();
            $datos = ['tenant' => $tenant->id, 'usuario' => $usuario->id, 'cliente' => $cliente->id, 'metodo' => $metodo->id, 'variante' => $variante->id];
            for ($i = 0; $i < 2; $i++) {
                $hijos[] = ProcesosConcurrentes::iniciar('venta', $datos);
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
                $lecturas = array_values(array_filter($eventos, static fn (array $evento): bool => isset($evento['lectura_stock'])));
                $this->assertNotEmpty($lecturas, 'El hijo debe leer el saldo antes de decidir.');
                foreach ($lecturas as $lectura) {
                    // El upsert también bloquea: la espera sola no detecta quitar FOR UPDATE.
                    $this->assertTrue($lectura['for_update'], 'La lectura del saldo debe ejecutar SELECT FOR UPDATE.');
                    $this->assertGreaterThan(0, $lectura['transaccion'], 'FOR UPDATE debe ejecutarse dentro de la transacción.');
                }
                $resultados[] = $eventos[array_key_last($eventos)]['resultado'];
            }
            sort($resultados);
            $this->assertSame(['stock_insuficiente', 'venta'], $resultados);
            $this->assertSame(0, (int) $stock->fresh()->stock_actual);
            $this->assertSame(1, Venta::where('tenant_id', $tenant->id)->count());
            $this->assertSame(1, Kardex::where('variante_id', $variante->id)->count());
            $this->assertSame(0, (int) Kardex::where('variante_id', $variante->id)->sole()->stock_resultante);
        } finally {
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
            if ($bloqueador !== null && $bloqueador->transactionLevel() > 0) {
                $bloqueador->rollBack();
            }
            DB::purge('bloqueador');
            // Fixtures confirmados quedan en la BD desechable para diagnosticar fallos.
            app(TenantContext::class)->set(null);
        }
    }
}
