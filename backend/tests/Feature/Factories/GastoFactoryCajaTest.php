<?php

declare(strict_types=1);

namespace Tests\Feature\Factories;

use App\Modules\Gastos\Models\Gasto;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * PRO-08: Gasto::factory() deja el gasto en la sucursal de su caja. Respeta lo que pasa el
 * test (sucursal, usuario o caja) y, como VentaFactory, usa la caja abierta de la sucursal
 * en vez de abrir otra (CajaService::abrirCajaConSucursal: una abierta por sucursal).
 */
class GastoFactoryCajaTest extends TestCase
{
    use RefreshDatabase;

    public function test_con_sucursal_dada_la_caja_del_gasto_esta_en_esa_sucursal(): void
    {
        $sucursal = Sucursal::factory()->create();

        $gasto = Gasto::factory()->create(['sucursal_id' => $sucursal->id]);

        $this->assertSame($sucursal->id, $gasto->sucursal_id);
        $this->assertSame($sucursal->id, $this->caja($gasto)->sucursal_id);
        $this->assertSame(1, $this->cajasAbiertas($sucursal->id));
    }

    public function test_con_sucursal_dada_reutiliza_la_caja_abierta(): void
    {
        $caja = CajaSesion::factory()->create();

        $gastos = Gasto::factory()->count(2)->create(['sucursal_id' => $caja->sucursal_id]);

        $this->assertSame([$caja->id], $gastos->pluck('caja_sesion_id')->unique()->values()->all());
        $this->assertSame(1, $this->cajasAbiertas($caja->sucursal_id));
    }

    public function test_con_sucursal_y_usuario_dados_abre_la_caja_con_ese_usuario(): void
    {
        $sucursal = Sucursal::factory()->create();
        $usuario = Usuario::factory()->create(['tenant_id' => $sucursal->tenant_id, 'sucursal_id' => $sucursal->id]);

        $gasto = Gasto::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id]);

        $this->assertSame($usuario->id, $gasto->usuario_id);
        $this->assertSame($sucursal->id, $this->caja($gasto)->sucursal_id);
        $this->assertSame($usuario->id, $this->caja($gasto)->usuario_id);
    }

    public function test_si_la_sucursal_solo_tiene_cajas_cerradas_abre_una(): void
    {
        $cerrada = CajaSesion::factory()->cerrada()->create();

        $gasto = Gasto::factory()->create(['sucursal_id' => $cerrada->sucursal_id]);

        $this->assertNotSame($cerrada->id, $gasto->caja_sesion_id);
        $this->assertSame($cerrada->sucursal_id, $this->caja($gasto)->sucursal_id);
        $this->assertSame(1, $this->cajasAbiertas($cerrada->sucursal_id));
    }

    public function test_con_caja_dada_sucursal_y_usuario_salen_de_ella(): void
    {
        $caja = CajaSesion::factory()->cerrada()->create();

        $gasto = Gasto::factory()->create(['caja_sesion_id' => $caja->id]);

        $this->assertSame($caja->id, $gasto->caja_sesion_id);
        $this->assertSame($caja->sucursal_id, $gasto->sucursal_id);
        $this->assertSame($caja->usuario_id, $gasto->usuario_id);
    }

    public function test_sin_datos_todo_es_coherente_y_del_mismo_tenant(): void
    {
        $gasto = Gasto::factory()->create();
        $caja = $this->caja($gasto);
        $sucursal = Sucursal::query()->withoutGlobalScopes()->findOrFail($gasto->sucursal_id);
        $usuario = Usuario::query()->withoutGlobalScopes()->findOrFail($gasto->usuario_id);

        $this->assertSame($caja->sucursal_id, $gasto->sucursal_id);
        $this->assertSame($caja->usuario_id, $gasto->usuario_id);
        $this->assertNotNull($sucursal->tenant_id);
        $this->assertSame($sucursal->tenant_id, $usuario->tenant_id);
    }

    private function caja(Gasto $gasto): CajaSesion
    {
        return CajaSesion::query()->withoutGlobalScopes()->findOrFail($gasto->caja_sesion_id);
    }

    private function cajasAbiertas(int $sucursalId): int
    {
        return CajaSesion::query()->withoutGlobalScopes()
            ->where('sucursal_id', $sucursalId)
            ->where('estado', 'abierta')
            ->count();
    }
}
