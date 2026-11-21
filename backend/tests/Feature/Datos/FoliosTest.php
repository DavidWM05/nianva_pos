<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Aplicacion\Folios\Folios;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FoliosTest extends TestCase
{
    use RefreshDatabase;

    public function test_las_series_de_sucursal_y_tipo_son_independientes_y_el_rollback_no_deja_hueco(): void
    {
        $sucursal = Sucursal::factory()->create();
        $otra = Sucursal::factory()->create(['tenant_id' => $sucursal->tenant_id]);
        $folio = fn (Sucursal $s, string $tipo): string => Folios::asignar($s->tenant_id, $s->id, $tipo);

        DB::beginTransaction();
        $primero = $folio($sucursal, 'V');
        DB::rollBack();

        DB::transaction(function () use ($folio, $sucursal, $otra, $primero): void {
            $this->assertSame("V-{$sucursal->id}-1", $primero);
            $this->assertSame($primero, $folio($sucursal, 'V'));
            $this->assertSame("V-{$sucursal->id}-2", $folio($sucursal, 'V'));
            $this->assertSame("A-{$sucursal->id}-1", $folio($sucursal, 'A'));
            $this->assertSame("V-{$otra->id}-1", $folio($otra, 'V'));
        });
    }
}
