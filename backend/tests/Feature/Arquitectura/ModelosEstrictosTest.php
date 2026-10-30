<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\MissingAttributeException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelosEstrictosTest extends TestCase
{
    use RefreshDatabase;

    public function test_las_tres_protecciones_estan_activas(): void
    {
        $this->assertTrue(Model::preventsLazyLoading());
        $this->assertTrue(Model::preventsSilentlyDiscardingAttributes());
        $this->assertTrue(Model::preventsAccessingMissingAttributes());
    }

    public function test_el_lazy_loading_lanza_excepcion(): void
    {
        $tenant = Tenant::create(['nombre' => 'Test estricto', 'pais' => 'MX', 'activo' => true]);
        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Ropa']);

        Producto::create([
            'tenant_id' => $tenant->id,
            'categoria_id' => $categoria->id,
            'nombre' => 'Producto 1',
        ]);
        Producto::create([
            'tenant_id' => $tenant->id,
            'categoria_id' => $categoria->id,
            'nombre' => 'Producto 2',
        ]);

        $productos = Producto::sinTenant()->limit(2)->get();

        $this->assertCount(2, $productos);
        $this->expectException(LazyLoadingViolationException::class);

        $productos->first()->categoria;
    }

    public function test_el_descarte_silencioso_de_atributos_lanza_excepcion(): void
    {
        $this->expectException(MassAssignmentException::class);

        new Categoria(['campo_que_no_existe' => 'x']);
    }

    public function test_acceder_a_un_atributo_no_seleccionado_lanza_excepcion(): void
    {
        $tenant = Tenant::create(['nombre' => 'Test estricto', 'pais' => 'MX', 'activo' => true]);
        Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Ropa']);

        $categoria = Categoria::sinTenant()->select('id')->firstOrFail();

        $this->expectException(MissingAttributeException::class);

        $categoria->nombre;
    }
}
