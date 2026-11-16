<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * DAT-09: cada indice unico de negocio lleva tenant_id primero. Dos tenants pueden usar el
 * mismo valor; el mismo tenant recibe 422 por la API cuando hay ruta que lo captura, o la
 * excepcion de unicidad de la base cuando el valor lo genera el sistema (folios de
 * cotizacion y pedido, codigo de gift card).
 *
 * Fuera quedan, por decision del responsable (2026-11-15): el RFC del cliente (no es unico),
 * el folio de venta (DAT-07) y el SKU de producto y el codigo de proveedor (no existen).
 * configuracion_tenant y configuracion_seguridad tienen unico (tenant_id) porque son una
 * fila por tenant, no un valor de negocio.
 */
class UnicidadDosTenantsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;

    private Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = Tenant::factory()->create();
        $this->tenantB = Tenant::factory()->create();
    }

    /**
     * Usuario del tenant con los permisos dados; deja el tenant en el contexto.
     *
     * @param  list<string>  $permisos
     */
    private function actuarEn(Tenant $tenant, array $permisos): void
    {
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach ($permisos as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);
    }

    // --- categorias (tenant_id, nombre) ---

    public function test_dos_tenants_pueden_tener_una_categoria_con_el_mismo_nombre(): void
    {
        Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Bebidas']);

        $this->actuarEn($this->tenantB, ['inventario.crear']);
        $this->postJson('/api/v1/categorias', ['nombre' => 'Bebidas'])->assertCreated();
    }

    public function test_el_mismo_tenant_no_repite_el_nombre_de_categoria(): void
    {
        Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Bebidas']);

        $this->actuarEn($this->tenantA, ['inventario.crear']);
        $this->postJson('/api/v1/categorias', ['nombre' => 'Bebidas'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nombre']);
    }

    public function test_editar_una_categoria_ignora_su_propio_nombre_y_rechaza_el_de_otra(): void
    {
        $bebidas = Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Bebidas']);
        Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Botanas']);

        $this->actuarEn($this->tenantA, ['inventario.editar']);
        $this->putJson("/api/v1/categorias/{$bebidas->id}", ['nombre' => 'Bebidas'])->assertOk();
        $this->putJson("/api/v1/categorias/{$bebidas->id}", ['nombre' => 'Botanas'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nombre']);
    }

    public function test_la_base_rechaza_una_categoria_repetida_en_el_mismo_tenant(): void
    {
        Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Bebidas']);
        Categoria::factory()->create(['tenant_id' => $this->tenantB->id, 'nombre' => 'Bebidas']);

        $this->expectException(UniqueConstraintViolationException::class);
        Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Bebidas']);
    }

    // --- unidades_medida (tenant_id, abreviatura) ---

    public function test_dos_tenants_pueden_tener_una_unidad_con_la_misma_abreviatura(): void
    {
        UnidadMedida::factory()->create(['tenant_id' => $this->tenantA->id, 'abreviatura' => 'caja']);

        $this->actuarEn($this->tenantB, ['inventario.crear']);
        $this->postJson('/api/v1/unidades-medida', ['nombre' => 'Caja', 'abreviatura' => 'caja', 'tipo' => 'entero'])
            ->assertCreated();
    }

    public function test_el_mismo_tenant_no_repite_la_abreviatura_de_unidad(): void
    {
        UnidadMedida::factory()->create(['tenant_id' => $this->tenantA->id, 'abreviatura' => 'caja']);

        $this->actuarEn($this->tenantA, ['inventario.crear']);
        $this->postJson('/api/v1/unidades-medida', ['nombre' => 'Caja', 'abreviatura' => 'caja', 'tipo' => 'entero'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['abreviatura']);
    }

    public function test_editar_una_unidad_ignora_su_propia_abreviatura_y_rechaza_la_de_otra(): void
    {
        $caja = UnidadMedida::factory()->create(['tenant_id' => $this->tenantA->id, 'abreviatura' => 'caja']);
        UnidadMedida::factory()->create(['tenant_id' => $this->tenantA->id, 'abreviatura' => 'paq']);

        $this->actuarEn($this->tenantA, ['inventario.editar']);
        $this->putJson("/api/v1/unidades-medida/{$caja->id}", ['abreviatura' => 'caja'])->assertOk();
        $this->putJson("/api/v1/unidades-medida/{$caja->id}", ['abreviatura' => 'paq'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['abreviatura']);
    }

    public function test_los_rechazos_de_categoria_y_unidad_repetidas_hablan_en_espanol(): void
    {
        Categoria::factory()->create(['tenant_id' => $this->tenantA->id, 'nombre' => 'Bebidas']);
        UnidadMedida::factory()->create(['tenant_id' => $this->tenantA->id, 'abreviatura' => 'caja']);

        $this->actuarEn($this->tenantA, ['inventario.crear']);
        $this->postJson('/api/v1/categorias', ['nombre' => 'Bebidas'])
            ->assertJsonPath('errors.nombre.0', 'Ya existe una categoría con ese nombre.');
        $this->postJson('/api/v1/unidades-medida', ['nombre' => 'Caja', 'abreviatura' => 'caja', 'tipo' => 'entero'])
            ->assertJsonPath('errors.abreviatura.0', 'Ya existe una unidad con esa abreviatura.');
    }

    // --- cupones (tenant_id, codigo) ---

    public function test_dos_tenants_pueden_tener_un_cupon_con_el_mismo_codigo_y_el_mismo_tenant_no(): void
    {
        Cupon::factory()->create(['tenant_id' => $this->tenantA->id, 'codigo' => 'VERANO']);
        $cupon = ['codigo' => 'VERANO', 'nombre' => 'Verano', 'tipo' => 'porcentaje', 'porcentaje' => '10'];

        $this->actuarEn($this->tenantB, ['cupones.crear']);
        $this->postJson('/api/v1/cupones', $cupon)->assertCreated();

        $this->actuarEn($this->tenantA, ['cupones.crear']);
        $this->postJson('/api/v1/cupones', $cupon)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['codigo']);
    }

    // --- producto_variantes (tenant_id, codigo_barras) ---

    public function test_dos_tenants_pueden_tener_el_mismo_codigo_de_barras_y_el_mismo_tenant_no(): void
    {
        $productoA = Producto::factory()->create(['tenant_id' => $this->tenantA->id]);
        $productoB = Producto::factory()->create(['tenant_id' => $this->tenantB->id]);
        ProductoVariante::factory()->create(['producto_id' => $productoA->id, 'codigo_barras' => '7501234567890']);

        $this->actuarEn($this->tenantB, ['inventario.crear']);
        $this->postJson("/api/v1/productos/{$productoB->id}/variantes", ['codigo_barras' => '7501234567890'])
            ->assertCreated();

        $this->actuarEn($this->tenantA, ['inventario.crear']);
        $this->postJson("/api/v1/productos/{$productoA->id}/variantes", ['codigo_barras' => '7501234567890'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['codigo_barras']);
    }

    // --- insumos (tenant_id, sku) ---

    public function test_dos_tenants_pueden_tener_un_insumo_con_el_mismo_sku_y_el_mismo_tenant_no(): void
    {
        Insumo::factory()->create(['tenant_id' => $this->tenantA->id, 'sku' => 'HARINA-01']);
        $unidadA = UnidadMedida::factory()->create(['tenant_id' => $this->tenantA->id]);
        $unidadB = UnidadMedida::factory()->create(['tenant_id' => $this->tenantB->id]);

        $this->actuarEn($this->tenantB, ['produccion.crear']);
        $this->postJson('/api/v1/insumos', ['nombre' => 'Harina', 'sku' => 'HARINA-01', 'unidad_medida_id' => $unidadB->id])
            ->assertCreated();

        $this->actuarEn($this->tenantA, ['produccion.crear']);
        $this->postJson('/api/v1/insumos', ['nombre' => 'Harina', 'sku' => 'HARINA-01', 'unidad_medida_id' => $unidadA->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['sku']);
    }

    // --- valores que genera el sistema: la base es la ultima defensa ---

    public function test_gift_cards_el_mismo_codigo_en_dos_tenants_si_y_en_el_mismo_no(): void
    {
        GiftCard::factory()->create(['tenant_id' => $this->tenantA->id, 'codigo' => 'GC-0001-ABCD']);
        GiftCard::factory()->create(['tenant_id' => $this->tenantB->id, 'codigo' => 'GC-0001-ABCD']);

        $this->expectException(UniqueConstraintViolationException::class);
        GiftCard::factory()->create(['tenant_id' => $this->tenantA->id, 'codigo' => 'GC-0001-ABCD']);
    }

    public function test_cotizaciones_el_mismo_folio_en_dos_tenants_si_y_en_el_mismo_no(): void
    {
        Cotizacion::factory()->create(['tenant_id' => $this->tenantA->id, 'numero_cotizacion' => 'COT-000001']);
        Cotizacion::factory()->create(['tenant_id' => $this->tenantB->id, 'numero_cotizacion' => 'COT-000001']);

        $this->expectException(UniqueConstraintViolationException::class);
        Cotizacion::factory()->create(['tenant_id' => $this->tenantA->id, 'numero_cotizacion' => 'COT-000001']);
    }

    public function test_pedidos_el_mismo_folio_en_dos_tenants_si_y_en_el_mismo_no(): void
    {
        Pedido::factory()->create(['tenant_id' => $this->tenantA->id, 'numero_pedido' => 'PED-000001']);
        Pedido::factory()->create(['tenant_id' => $this->tenantB->id, 'numero_pedido' => 'PED-000001']);

        $this->expectException(UniqueConstraintViolationException::class);
        Pedido::factory()->create(['tenant_id' => $this->tenantA->id, 'numero_pedido' => 'PED-000001']);
    }
}
