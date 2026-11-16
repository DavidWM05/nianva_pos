<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CatalogoPrecioIvaTest extends TestCase
{
    use RefreshDatabase;

    private function autenticar(): Tenant
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach (['inventario.ver', 'inventario.crear', 'inventario.editar', 'configuracion.ver', 'configuracion.editar'] as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $permiso = Permiso::factory()->create(compact('nombre', 'modulo', 'accion'));
            $rol->permisos()->attach($permiso);
        }
        $usuario->roles()->attach($rol);
        $this->actingAs($usuario);

        return $tenant;
    }

    public function test_producto_conserva_tasa_exencion_y_herencia_en_altas_y_ediciones(): void
    {
        $this->autenticar();
        $respuesta = $this->postJson('/api/v1/productos', ['nombre' => 'Producto IVA', 'tasa_iva' => '8.0000', 'exento_iva' => true]);
        $respuesta->assertCreated()->assertJsonPath('data.tasa_iva', '8.0000')->assertJsonPath('data.exento_iva', true);
        $id = $respuesta->json('data.id');
        $this->putJson('/api/v1/productos/'.$id, ['nombre' => 'Producto IVA', 'tasa_iva' => null, 'exento_iva' => false])
            ->assertOk()->assertJsonPath('data.tasa_iva', null)->assertJsonPath('data.exento_iva', false);
    }

    public function test_variante_conserva_cero_propio_y_null_para_heredar_sin_alterar_una_edicion_parcial(): void
    {
        $tenant = $this->autenticar();
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $ruta = '/api/v1/productos/'.$producto->id.'/variantes';
        $respuesta = $this->postJson($ruta, ['precio_venta' => '0.00', 'costo' => '2.35']);
        $respuesta->assertCreated()->assertJsonPath('data.precio_venta', '0.00')->assertJsonPath('data.costo', '2.35');
        $id = $respuesta->json('data.id');
        $this->putJson('/api/v1/producto-variantes/'.$id, [])->assertOk()->assertJsonPath('data.costo', '2.35');
        $this->putJson('/api/v1/producto-variantes/'.$id, ['precio_venta' => null, 'costo' => null])->assertOk()->assertJsonPath('data.precio_venta', null)->assertJsonPath('data.costo', null);
    }

    #[DataProvider('tasasInvalidas')]
    public function test_el_catalogo_rechaza_tasas_fuera_del_dominio(string $tasa): void
    {
        $this->autenticar();
        $this->postJson('/api/v1/productos', ['nombre' => 'IVA inválido', 'tasa_iva' => $tasa])->assertUnprocessable()->assertJsonValidationErrors('tasa_iva');
    }

    public static function tasasInvalidas(): array
    {
        return [['-1'], ['15'], ['16.00001'], ['abc']];
    }

    public function test_configuracion_expone_default_diecisies_y_guarda_ocho(): void
    {
        $this->autenticar();
        $respuesta = $this->getJson('/api/v1/configuracion');
        $respuesta->assertOk()->assertJsonPath('data.tasa_iva_default', '16.0000');
        $datos = $respuesta->json('data');
        unset($datos['backup_ultimo']);
        $datos['tasa_iva_default'] = '8.0000';
        $this->putJson('/api/v1/configuracion', $datos)->assertOk()->assertJsonPath('data.tasa_iva_default', '8.0000');
        $datos['tasa_iva_default'] = '7.0000';
        $this->putJson('/api/v1/configuracion', $datos)->assertUnprocessable()->assertJsonValidationErrors('tasa_iva_default');
    }
}
