<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('concurrencia')]
final class CuotaTerminalConcurrenteTest extends TestCase
{
    public function test_solo_un_alta_simultanea_consume_la_ultima_plaza_del_tenant(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $usuario = Usuario::factory()->create();
        $datos = ['tenant' => $usuario->tenant_id, 'usuario' => $usuario->id, 'sucursal' => $usuario->sucursal_id];
        $hijos = [];

        try {
            DB::beginTransaction();
            DB::table('tenants')->where('id', $usuario->tenant_id)->lockForUpdate()->first();
            $hijos[] = ProcesosConcurrentes::iniciar('alta_terminal', [...$datos, 'terminal' => 1]);
            $hijos[] = ProcesosConcurrentes::iniciar('alta_terminal', [...$datos, 'terminal' => 2]);
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::esperarBloqueo($hijo);
            }
            DB::commit();

            $resultados = [];
            foreach ($hijos as $hijo) {
                $hijo->wait();
                $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                $resultados[] = $eventos[array_key_last($eventos)]['resultado'];
            }

            $this->assertEqualsCanonicalizing(['creada', 'limite_plan_excedido'], $resultados);
            $this->assertSame(1, Terminal::sinTenant()->where('tenant_id', $usuario->tenant_id)->count());
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
        }
    }
}
