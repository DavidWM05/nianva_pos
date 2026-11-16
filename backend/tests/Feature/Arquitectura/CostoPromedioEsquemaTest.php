<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Tests\TestCase;

class CostoPromedioEsquemaTest extends TestCase
{
    public function test_el_promedio_es_d2_no_nulo_con_cero_y_el_ultimo_costo_es_d2_nullable(): void
    {
        $snapshot = json_decode(file_get_contents(base_path('tests/Fixtures/esquema.json')), true, flags: JSON_THROW_ON_ERROR);
        $columnas = array_column($snapshot['inventario_stock']['columnas'], null, 'nombre');
        $this->assertArrayHasKey('costo_promedio', $columnas);
        $this->assertArrayHasKey('ultimo_costo', $columnas);
        $this->assertFalse($columnas['costo_promedio']['nullable']);
        $this->assertSame("'0'", $columnas['costo_promedio']['default']);
        $this->assertTrue($columnas['ultimo_costo']['nullable']);
        $this->assertNull($columnas['ultimo_costo']['default']);
        $migracion = file_get_contents(app_path('Modules/Inventario/Database/Migrations/2026_07_21_000006_create_inventario_stock_table.php'));
        $this->assertMatchesRegularExpression("/->decimal\\('costo_promedio',\\s*12,\\s*2\\)->default\\(0\\)/", $migracion);
        $this->assertMatchesRegularExpression("/->decimal\\('ultimo_costo',\\s*12,\\s*2\\)->nullable\\(\\)/", $migracion);
    }
}
