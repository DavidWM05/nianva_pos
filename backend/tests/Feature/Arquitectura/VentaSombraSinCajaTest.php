<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class VentaSombraSinCajaTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    private function atributos(bool $sombra): array
    {
        $d = $this->negocio04b(cajaAbierta: false);

        return ['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id,
            'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id,
            'caja_sesion_id' => null, 'es_venta_sombra' => $sombra, 'total' => '100.00'];
    }

    public function test_la_base_rechaza_una_venta_normal_sin_caja(): void
    {
        $datos = $this->atributos(false) + ['ulid' => (string) Str::ulid()];
        $this->expectException(QueryException::class);
        DB::table('ventas')->insert($datos);
    }

    public function test_la_base_acepta_una_venta_sombra_sin_caja(): void
    {
        $venta = Venta::query()->create($this->atributos(true));
        $this->assertNull($venta->fresh()->getAttribute('caja_sesion_id'));
        $this->assertTrue($venta->fresh()->es_venta_sombra);
    }

    public function test_el_check_rechaza_la_venta_normal_sin_caja_aunque_traiga_ulid(): void
    {
        // DAT-08: con ulid NOT NULL, un insert sin ulid falla antes de llegar al CHECK; este caso
        // trae un ulid válido para que lo único que falle sea la condición caja-o-sombra.
        $datos = $this->atributos(false) + ['ulid' => strtolower((string) Str::ulid())];
        $this->expectException(QueryException::class);
        $this->expectExceptionMessageMatches('/check constraint/i');
        DB::table('ventas')->insert($datos);
    }

    public function test_el_check_impide_convertir_en_normal_una_sombra_sin_caja(): void
    {
        $venta = Venta::query()->create($this->atributos(true));
        $this->expectException(QueryException::class);
        DB::table('ventas')->where('id', $venta->id)->update(['es_venta_sombra' => false]);
    }
}
