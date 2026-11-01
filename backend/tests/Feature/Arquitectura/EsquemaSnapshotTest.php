<?php

namespace Tests\Feature\Arquitectura;

use Tests\TestCase;

class EsquemaSnapshotTest extends TestCase
{
    public function test_el_snapshot_versionado_coincide_con_las_migraciones(): void
    {
        $this->artisan('esquema:snapshot', ['--check' => true])
            ->assertSuccessful();
    }
}
