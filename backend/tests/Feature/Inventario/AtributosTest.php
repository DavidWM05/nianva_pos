<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\VarianteAtributoValor;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * ARQ-07: atributos genericos de variante, sus valores, el nombre de la variante armado con
 * ellos y la busqueda del catalogo por valor de atributo.
 */
class AtributosTest extends TestCase
{
    use RefreshDatabase;

    private const PERMISOS = ['inventario.ver', 'inventario.crear', 'inventario.editar', 'inventario.eliminar'];

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create();
        $this->actuarEn($this->tenant);
    }

    private function actuarEn(Tenant $tenant): void
    {
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach (self::PERMISOS as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);
    }

    /** @return array{talla: Atributo, color: Atributo, m: AtributoValor, l: AtributoValor, rojo: AtributoValor} */
    private function tallaYColor(int $ordenTalla = 0, int $ordenColor = 1): array
    {
        $talla = Atributo::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Talla', 'orden' => $ordenTalla]);
        $color = Atributo::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Color', 'orden' => $ordenColor]);

        return [
            'talla' => $talla,
            'color' => $color,
            'm' => AtributoValor::factory()->create(['atributo_id' => $talla->id, 'valor' => 'M']),
            'l' => AtributoValor::factory()->create(['atributo_id' => $talla->id, 'valor' => 'L']),
            'rojo' => AtributoValor::factory()->create(['atributo_id' => $color->id, 'valor' => 'Rojo']),
        ];
    }

    public function test_crea_un_atributo_y_sus_valores_y_el_detalle_los_trae_en_orden(): void
    {
        $id = $this->postJson('/api/v1/atributos', ['nombre' => 'Medida', 'orden' => 2])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Medida')
            ->assertJsonPath('data.valores', [])
            ->json('data.id');

        $this->postJson("/api/v1/atributos/{$id}/valores", ['nombre' => '1/2"', 'orden' => 1])->assertCreated();
        $this->postJson("/api/v1/atributos/{$id}/valores", ['nombre' => '1/4"', 'orden' => 0])
            ->assertCreated()
            ->assertJsonPath('data.valores.0.nombre', '1/4"')
            ->assertJsonPath('data.valores.1.nombre', '1/2"');

        $this->getJson("/api/v1/atributos/{$id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.valores')
            ->assertJsonPath('meta.permisos.editar', true);
        $this->getJson('/api/v1/atributos')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('meta.page', 1);
    }

    public function test_el_nombre_es_unico_por_tenant_y_el_valor_por_atributo(): void
    {
        $atributo = Atributo::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Medida']);
        AtributoValor::factory()->create(['atributo_id' => $atributo->id, 'valor' => '1"']);

        $this->postJson('/api/v1/atributos', ['nombre' => 'Medida'])
            ->assertStatus(422)
            ->assertJsonPath('errors.nombre.0', 'Ya existe un atributo con ese nombre.');
        $this->postJson("/api/v1/atributos/{$atributo->id}/valores", ['nombre' => '1"'])
            ->assertStatus(422)
            ->assertJsonPath('errors.nombre.0', 'Ese atributo ya tiene ese valor.');

        $this->actuarEn(Tenant::factory()->create());
        $this->postJson('/api/v1/atributos', ['nombre' => 'Medida'])->assertCreated();
    }

    public function test_un_atributo_de_otro_tenant_no_se_ve(): void
    {
        $ajeno = Atributo::factory()->create(['tenant_id' => Tenant::factory()->create()->id]);

        $this->getJson("/api/v1/atributos/{$ajeno->id}")->assertNotFound();
    }

    public function test_no_se_borra_un_valor_ni_un_atributo_que_usa_una_variante(): void
    {
        ['talla' => $talla, 'm' => $m, 'l' => $l] = $this->tallaYColor();
        $variante = ProductoVariante::factory()->create(['producto_id' => Producto::factory()->create(['tenant_id' => $this->tenant->id])->id]);
        VarianteAtributoValor::factory()->create(['variante_id' => $variante->id, 'atributo_valor_id' => $m->id]);

        $this->deleteJson("/api/v1/atributo-valores/{$m->id}")->assertStatus(422)->assertJsonPath('error_code', 'atributo_en_uso');
        $this->deleteJson("/api/v1/atributos/{$talla->id}")->assertStatus(422)->assertJsonPath('error_code', 'atributo_en_uso');
        $this->deleteJson("/api/v1/atributo-valores/{$l->id}")->assertNoContent();
    }

    public function test_la_variante_se_llama_con_sus_valores_en_el_orden_del_atributo(): void
    {
        ['m' => $m, 'rojo' => $rojo] = $this->tallaYColor(ordenTalla: 0, ordenColor: 1);
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->postJson("/api/v1/productos/{$producto->id}/variantes", ['valores' => [$rojo->id, $m->id]])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'M / Rojo')
            ->assertJsonPath('data.atributos.0.atributo', 'Talla')
            ->assertJsonPath('data.atributos.0.valor_nombre', 'M')
            ->assertJsonPath('data.atributos.1.valor_nombre', 'Rojo');
    }

    public function test_el_orden_del_atributo_manda_en_el_nombre(): void
    {
        ['m' => $m, 'rojo' => $rojo] = $this->tallaYColor(ordenTalla: 1, ordenColor: 0);
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->postJson("/api/v1/productos/{$producto->id}/variantes", ['valores' => [$m->id, $rojo->id]])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Rojo / M');
    }

    /**
     * ARQ-07b: sin atributos, `nombre` es null (nunca cadena vacia ni el nombre del producto) en
     * cada Resource que lo publica: variante, linea de venta, top del reporte, apartado,
     * devolucion y regla de precio.
     */
    public function test_sin_atributos_el_nombre_es_null_en_los_resources_que_lo_publican(): void
    {
        $t = $this->tenant->id;
        $usuario = Usuario::factory()->create(['tenant_id' => $t]);
        $rol = Rol::factory()->create(['tenant_id' => $t]);
        foreach (['inventario.ver', 'ventas.ver', 'reportes.ver', 'apartados.ver', 'devoluciones.ver', 'reglas_precio.ver', 'sucursales.todas'] as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);

        $producto = Producto::factory()->create(['tenant_id' => $t, 'nombre' => 'Sin atributos']);
        $variante = ProductoVariante::create(['producto_id' => $producto->id]);
        $venta = Venta::factory()->create(['tenant_id' => $t]);
        VentaDetalle::factory()->create(['venta_id' => $venta->id, 'variante_id' => $variante->id]);
        $apartado = Apartado::factory()->create(['tenant_id' => $t]);
        ApartadoDetalle::factory()->create(['apartado_id' => $apartado->id, 'variante_id' => $variante->id]);
        $devolucion = Devolucion::factory()->create(['venta_id' => $venta->id]);
        DevolucionItem::factory()->create(['devolucion_id' => $devolucion->id, 'variante_id' => $variante->id]);
        $regla = ReglaPrecio::factory()->create(['tenant_id' => $t, 'aplica_a' => 'variante', 'variante_id' => $variante->id]);

        $this->getJson("/api/v1/productos/{$producto->id}")->assertOk()->assertJsonPath('data.variantes.0.nombre', null);
        $this->getJson("/api/v1/ventas/{$venta->id}")->assertOk()->assertJsonPath('data.detalles.0.variante.nombre', null);
        $this->getJson('/api/v1/ventas/reporte')->assertOk()->assertJsonPath('data.top_productos.0.nombre', null);
        $this->getJson("/api/v1/apartados/{$apartado->id}")->assertOk()->assertJsonPath('data.detalles.0.variante.nombre', null);
        $this->getJson("/api/v1/devoluciones/{$devolucion->id}")->assertOk()->assertJsonPath('data.items.0.variante.nombre', null);
        $this->getJson("/api/v1/reglas-precio/{$regla->id}")->assertOk()->assertJsonPath('data.variante.nombre', null);
    }

    public function test_un_solo_valor_por_atributo_y_solo_del_tenant(): void
    {
        ['m' => $m, 'l' => $l] = $this->tallaYColor();
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $ajeno = AtributoValor::factory()->create([
            'atributo_id' => Atributo::factory()->create(['tenant_id' => Tenant::factory()->create()->id])->id,
        ]);

        $this->postJson("/api/v1/productos/{$producto->id}/variantes", ['valores' => [$m->id, $l->id]])
            ->assertStatus(422)
            ->assertJsonPath('errors.valores.0', 'Elige un solo valor por atributo.');
        $this->postJson("/api/v1/productos/{$producto->id}/variantes", ['valores' => [$ajeno->id]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['valores.0']);
    }

    public function test_editar_sin_valores_los_conserva_y_con_lista_vacia_los_quita(): void
    {
        ['m' => $m] = $this->tallaYColor();
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $id = $this->postJson("/api/v1/productos/{$producto->id}/variantes", ['valores' => [$m->id]])->json('data.id');

        $this->putJson("/api/v1/producto-variantes/{$id}", ['codigo_barras' => 'X-1'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'M');
        $this->putJson("/api/v1/producto-variantes/{$id}", ['valores' => []])
            ->assertOk()
            ->assertJsonPath('data.atributos', []);
        $this->assertSame(0, VarianteAtributoValor::query()->where('variante_id', $id)->count());
    }

    public function test_el_catalogo_encuentra_un_producto_por_el_valor_de_atributo_de_su_variante(): void
    {
        ['rojo' => $rojo] = $this->tallaYColor();
        $playera = Producto::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Playera basica']);
        Producto::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Gorra']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $playera->id]);
        VarianteAtributoValor::factory()->create(['variante_id' => $variante->id, 'atributo_valor_id' => $rojo->id]);

        $this->getJson('/api/v1/productos?filtro_nombre=Rojo')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Playera basica');
        $this->getJson('/api/v1/productos?filtro_nombre=Gorra')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_el_detalle_del_producto_trae_el_nombre_de_cada_variante(): void
    {
        ['m' => $m] = $this->tallaYColor();
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $variante = ProductoVariante::factory()->conAtributos([])->create(['producto_id' => $producto->id]);
        VarianteAtributoValor::factory()->create(['variante_id' => $variante->id, 'atributo_valor_id' => $m->id]);

        $this->getJson("/api/v1/productos/{$producto->id}")
            ->assertOk()
            ->assertJsonPath('data.variantes.0.nombre', 'M');
    }
}
