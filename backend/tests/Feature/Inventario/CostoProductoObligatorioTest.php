<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Producto;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CostoProductoObligatorioTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['inventario.crear', 'inventario.editar']);
        $this->actingAs($this->usuario);
    }

    public function test_alta_sin_costo_o_con_null_rechaza_y_cero_explicito_se_acepta(): void
    {
        $this->postJson('/api/v1/productos', ['nombre' => 'Sin costo'])->assertUnprocessable()->assertJsonValidationErrors('precio_compra');
        $this->postJson('/api/v1/productos', ['nombre' => 'Costo nulo', 'precio_compra' => null])->assertUnprocessable()->assertJsonValidationErrors('precio_compra');
        $this->postJson('/api/v1/productos', ['nombre' => 'Costo cero', 'precio_compra' => '0.00'])->assertCreated()->assertJsonPath('data.precio_compra', '0.00');
    }

    public function test_costo_no_acepta_negativos_ni_mas_de_dos_decimales(): void
    {
        foreach (['-0.01', '1.001'] as $costo) {
            $this->postJson('/api/v1/productos', ['nombre' => 'Costo inválido', 'precio_compra' => $costo])->assertUnprocessable()->assertJsonValidationErrors('precio_compra');
        }
    }

    public function test_edicion_sin_costo_conserva_el_anterior_y_null_se_rechaza(): void
    {
        $this->putJson('/api/v1/productos/'.$this->producto->id, ['nombre' => 'Renombrado'])->assertOk()->assertJsonPath('data.precio_compra', '50.00');
        $this->putJson('/api/v1/productos/'.$this->producto->id, ['nombre' => 'Renombrado', 'precio_compra' => null])->assertUnprocessable()->assertJsonValidationErrors('precio_compra');
    }

    public function test_columna_no_tiene_default_y_rechaza_insert_sin_costo(): void
    {
        $columna = collect(Schema::getColumns('productos'))->firstWhere('name', 'precio_compra');
        $this->assertNull($columna['default']);
        $this->expectException(QueryException::class);
        DB::table('productos')->insert(['tenant_id' => $this->tenant->id, 'nombre' => 'Sin default']);
    }

    public function test_factory_aporta_un_costo_explicito(): void
    {
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->assertNotNull($producto->fresh()->precio_compra);
    }
}
