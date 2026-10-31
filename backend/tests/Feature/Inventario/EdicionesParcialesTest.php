<?php

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class EdicionesParcialesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['inventario.crear', 'inventario.editar']);
    }

    public function test_actualizar_categoria_solo_con_nombre_conserva_descripcion(): void
    {
        $categoria = Categoria::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Original',
            'descripcion' => 'Descripcion original',
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/categorias/{$categoria->id}", ['nombre' => 'Actualizada'])
            ->assertOk();

        $categoria->refresh();
        $this->assertSame('Actualizada', $categoria->nombre);
        $this->assertSame('Descripcion original', $categoria->descripcion);
    }

    public function test_actualizar_departamento_solo_con_nombre_conserva_descripcion(): void
    {
        $departamento = Departamento::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Original',
            'descripcion' => 'Descripcion original',
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/departamentos/{$departamento->id}", ['nombre' => 'Actualizado'])
            ->assertOk();

        $departamento->refresh();
        $this->assertSame('Actualizado', $departamento->nombre);
        $this->assertSame('Descripcion original', $departamento->descripcion);
    }

    public function test_actualizar_producto_solo_con_nombre_conserva_los_demas_campos(): void
    {
        $producto = Producto::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Original',
            'descripcion' => 'Descripcion original',
            'precio_venta' => 123.45,
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/productos/{$producto->id}", ['nombre' => 'Actualizado'])
            ->assertOk();

        $producto->refresh();
        $this->assertSame('Actualizado', $producto->nombre);
        $this->assertSame('Descripcion original', $producto->descripcion);
        $this->assertSame(123.45, (float) $producto->precio_venta);
    }

    public function test_actualizar_variante_solo_con_talla_conserva_color_y_codigo(): void
    {
        $variante = ProductoVariante::create([
            'producto_id' => $this->producto->id,
            'talla' => 'S',
            'color' => 'Rojo',
            'codigo_barras' => 'PARCIAL-VARIANTE-1',
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/producto-variantes/{$variante->id}", ['talla' => 'M'])
            ->assertOk();

        $variante->refresh();
        $this->assertSame('M', $variante->talla);
        $this->assertSame('Rojo', $variante->color);
        $this->assertSame('PARCIAL-VARIANTE-1', $variante->codigo_barras);
    }
}
