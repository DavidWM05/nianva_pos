<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Aplicacion\Ventas\AnularVenta;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Tpv\Dtos\AnularVentaDto;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\PreparaArq04b;
use Tests\TestCase;

class PresentacionesApiTest extends TestCase
{
    use PreparaArq04b;
    use RefreshDatabase;

    private function actor(): array
    {
        $d = $this->negocio04b(stockInicial: 20);
        $rol = Rol::factory()->create(['tenant_id' => $d['tenant']->id]);
        foreach (['inventario.ver', 'inventario.editar', 'inventario.crear', 'ventas.crear', 'devoluciones.crear'] as $nombre) {
            [$modulo,$accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::factory()->create(compact('nombre', 'modulo', 'accion')));
        }
        $d['usuario']->roles()->attach($rol);
        $this->actingAs($d['usuario']);

        return $d;
    }

    public function test_crud_anidado_valida_factor_precio_y_tenant(): void
    {
        $d = $this->actor();
        $ruta = '/api/v1/producto-variantes/'.$d['variante']->id.'/presentaciones';
        $r = $this->postJson($ruta, ['nombre' => 'Caja', 'factor' => '6.000', 'codigo_barras' => 'CAJA-6', 'precio_venta' => '50.00'])->assertCreated()->assertJsonPath('data.factor', '6.000')->assertJsonPath('data.precio_venta', '50.00');
        $id = $r->json('data.id');
        $this->getJson($ruta)->assertOk()->assertJsonCount(1, 'data');
        $this->putJson($ruta.'/'.$id, ['nombre' => 'Caja', 'factor' => '12.000', 'precio_venta' => null])->assertOk()->assertJsonPath('data.precio_venta', null);
        foreach (['0', '-1', '1.0001'] as $factor) {
            $this->postJson($ruta, ['nombre' => 'Incorrecta', 'factor' => $factor])->assertUnprocessable()->assertJsonValidationErrors('factor');
        }
        $otra = ProductoVariante::factory()->create();
        $this->deleteJson('/api/v1/producto-variantes/'.$otra->id.'/presentaciones/'.$id)->assertNotFound();
        $this->deleteJson($ruta.'/'.$id)->assertNoContent();
    }

    public function test_codigo_no_se_repite_entre_variantes_y_presentaciones_del_tenant(): void
    {
        $d = $this->actor();
        $ruta = '/api/v1/producto-variantes/'.$d['variante']->id.'/presentaciones';
        $this->postJson($ruta, ['nombre' => 'Duplicada', 'factor' => 6, 'codigo_barras' => $d['variante']->codigo_barras])->assertUnprocessable()->assertJsonValidationErrors('codigo_barras');
        $this->postJson($ruta, ['nombre' => 'Caja', 'factor' => 6, 'codigo_barras' => 'COD-CAJA'])->assertCreated();
        $this->putJson('/api/v1/producto-variantes/'.$d['variante']->id, ['codigo_barras' => 'COD-CAJA'])->assertUnprocessable()->assertJsonValidationErrors('codigo_barras');
        $this->postJson($ruta, ['nombre' => 'Otra', 'factor' => 3, 'codigo_barras' => 'COD-CAJA'])->assertUnprocessable()->assertJsonValidationErrors('codigo_barras');
        $this->postJson($ruta, ['nombre' => 'Sin código', 'factor' => 3])->assertCreated();
    }

    private function venta(array $d, Presentacion $p): string
    {
        return $this->postJson('/api/v1/ventas', ['cliente_id' => $d['cliente']->ulid, 'items' => [['variante_id' => $d['variante']->id, 'presentacion_id' => $p->id, 'cantidad' => 2]], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => 100]]])->assertCreated()->assertJsonPath('data.total', '100.00')->json('data.id');
    }

    public function test_vender_y_anular_usa_factor_original_aunque_editen_la_presentacion(): void
    {
        $d = $this->actor();
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '6.000', 'precio_venta' => '50.00']);
        $id = $this->venta($d, $p);
        $this->assertSame(8, $d['stock']->refresh()->stock_actual);
        $this->assertSame(12, Kardex::firstOrFail()->cantidad);
        $p->update(['factor' => '9.000']);
        app(AnularVenta::class)->ejecutar(new AnularVentaDto('Revisión'), Venta::query()->where('ulid', $id)->firstOrFail(), $d['usuario']);
        $this->assertSame(20, $d['stock']->refresh()->stock_actual);
    }

    public function test_devolver_restituye_unidades_base_de_la_linea_original(): void
    {
        $d = $this->actor();
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '6.000', 'precio_venta' => '50.00']);
        $id = $this->venta($d, $p);
        $p->update(['factor' => '9.000']);
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $id, 'tipo' => 'devolucion', 'items_devueltos' => [['variante_id' => $d['variante']->id, 'cantidad' => 1]], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => 50]]])->assertCreated();
        $this->assertSame(14, $d['stock']->refresh()->stock_actual);
    }

    public function test_escaneo_resuelve_la_presentacion_y_se_cobra_con_sus_unidades_base(): void
    {
        $d = $this->actor();
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '6.000', 'precio_venta' => '50.00', 'codigo_barras' => 'LECTURA-6']);
        $this->getJson('/api/v1/ventas/codigo?codigo=LECTURA-6')->assertOk()->assertJsonPath('data.presentacion_id', $p->id)->assertJsonPath('data.factor', '6.000')->assertJsonPath('data.stock_actual', '20.000');
        $this->venta($d, $p);
        $this->assertSame(8, $d['stock']->refresh()->stock_actual);
        $this->getJson('/api/v1/ventas/codigo?codigo='.$d['variante']->codigo_barras)->assertOk()->assertJsonPath('data.presentacion_id', null)->assertJsonPath('data.factor', '1.000');
    }

    public function test_no_permite_presentacion_ajena_a_la_variante_ni_al_tenant(): void
    {
        $d = $this->actor();
        $p = Presentacion::factory()->create();
        $this->postJson('/api/v1/ventas/cotizar', ['items' => [['variante_id' => $d['variante']->id, 'cantidad' => 1, 'presentacion_id' => $p->id]]])->assertUnprocessable()->assertJsonValidationErrors('items.0.presentacion_id');
    }

    #[DataProvider('lineasDeMismaVariante')]
    public function test_devolver_una_presentacion_identifica_la_linea_entre_dos_de_la_misma_variante(int $posicion, int $importe, int $stockFinal): void
    {
        $d = $this->actor();
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '6.000', 'precio_venta' => '50.00']);
        $venta = $this->postJson('/api/v1/ventas', ['cliente_id' => $d['cliente']->ulid, 'items' => [['variante_id' => $d['variante']->id, 'cantidad' => 1], ['variante_id' => $d['variante']->id, 'cantidad' => 1, 'presentacion_id' => $p->id]], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => 150]]])->assertCreated();
        $origen = collect($venta->json('data.detalles'))->firstWhere('precio_unitario', $importe === 100 ? '100.00' : '50.00');
        $this->assertNotNull($origen);
        $this->assertSame(13, $d['stock']->refresh()->stock_actual);
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $venta->json('data.id'), 'tipo' => 'devolucion', 'items_devueltos' => [['variante_id' => $d['variante']->id, 'venta_detalle_id' => $origen['id'], 'cantidad' => 1]], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => $importe]]])->assertCreated();
        $this->assertSame($stockFinal, $d['stock']->refresh()->stock_actual);
    }

    public static function lineasDeMismaVariante(): array
    {
        return [[0, 100, 14], [1, 50, 19]];
    }

    public function test_granel_acepta_fraccion_y_pieza_exige_unidades_base_enteras(): void
    {
        $d = $this->actor();
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '0.500', 'precio_venta' => '50.00']);
        $this->postJson('/api/v1/ventas/cotizar', ['items' => [['variante_id' => $d['variante']->id, 'presentacion_id' => $p->id, 'cantidad' => 1]]])->assertUnprocessable()->assertJsonValidationErrors('items.0.presentacion_id');
        $d['variante']->update(['es_granel' => true]);
        $this->postJson('/api/v1/ventas', ['cliente_id' => $d['cliente']->ulid, 'items' => [['variante_id' => $d['variante']->id, 'presentacion_id' => $p->id, 'cantidad' => '0.500']], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => 25]]])->assertCreated()->assertJsonPath('data.total', '25.00');
        $this->assertSame(19.75, $d['stock']->refresh()->stock_actual);
    }

    public function test_codigo_de_otro_tenant_no_impide_crear_presentacion(): void
    {
        $d = $this->actor();
        $otro = Tenant::factory()->create();
        $producto = Producto::factory()->create(['tenant_id' => $otro->id]);
        ProductoVariante::factory()->create(['producto_id' => $producto->id, 'codigo_barras' => 'COMPARTIDO']);
        $this->postJson('/api/v1/producto-variantes/'.$d['variante']->id.'/presentaciones', ['nombre' => 'Caja', 'factor' => 6, 'codigo_barras' => 'COMPARTIDO'])->assertCreated();
    }

    public function test_descarta_cantidades_base_no_representables(): void
    {
        $d = $this->actor();
        $d['variante']->update(['es_granel' => true]);
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '0.001']);
        $this->postJson('/api/v1/ventas/cotizar', ['items' => [['variante_id' => $d['variante']->id, 'presentacion_id' => $p->id, 'cantidad' => '0.001']]])->assertUnprocessable()->assertJsonValidationErrors('items.0.presentacion_id');
    }

    public function test_reembolso_de_presentacion_no_supera_el_subtotal_redondeado_de_la_linea(): void
    {
        $d = $this->actor();
        $d['producto']->update(['precio_venta' => '1.01']);
        $d['variante']->update(['es_granel' => true]);
        $p = Presentacion::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['variante']->id, 'factor' => '0.500', 'precio_venta' => null]);
        $venta = $this->postJson('/api/v1/ventas', ['cliente_id' => $d['cliente']->ulid, 'items' => [['variante_id' => $d['variante']->id, 'presentacion_id' => $p->id, 'cantidad' => 3]], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => 1.52]]])->assertCreated();
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $venta->json('data.id'), 'tipo' => 'devolucion', 'items_devueltos' => [['variante_id' => $d['variante']->id, 'cantidad' => 3]], 'pagos' => [['metodo_pago_id' => $d['metodo']->id, 'monto' => 1.52]]])->assertCreated()->assertJsonPath('data.monto_devolucion', '1.52');
        $this->assertSame(20, $d['stock']->refresh()->stock_actual);
    }

    public function test_factory_respeta_el_tenant_dado_al_crear_la_variante(): void
    {
        $d = $this->actor();
        $otro = Tenant::factory()->create();
        $presentacion = Presentacion::factory()->create(['tenant_id' => $otro->id]);
        $variante = ProductoVariante::withoutGlobalScopes()->findOrFail($presentacion->variante_id);
        $this->assertSame($otro->id, $variante->getAttribute('tenant_id'));
        $this->assertSame($otro->id, $presentacion->tenant_id);
    }
}
