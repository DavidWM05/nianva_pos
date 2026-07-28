<?php

namespace Tests\Feature\UnidadesMedida;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\UnidadesMedida\Exceptions\UnidadEnUsoException;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use App\Modules\UnidadesMedida\Services\UnidadMedidaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnidadMedidaServiceTest extends TestCase
{
    use RefreshDatabase;

    private UnidadMedidaService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(UnidadMedidaService::class);
    }

    public function test_crear_unidad(): void
    {
        $tenant = Tenant::create(['nombre' => 'Test', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant);

        $unidad = $this->service->crear([
            'tenant_id' => $tenant->id,
            'nombre' => 'Kilogramo',
            'abreviatura' => 'kg',
            'tipo' => 'fraccionario',
        ]);

        $this->assertSame('Kilogramo', $unidad->nombre);
        $this->assertSame('kg', $unidad->abreviatura);
        $this->assertSame('fraccionario', $unidad->tipo);
        $this->assertTrue($unidad->activo);
    }

    public function test_abreviatura_unica_por_tenant(): void
    {
        $tenant = Tenant::create(['nombre' => 'Test', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant);

        $this->service->crear([
            'tenant_id' => $tenant->id,
            'nombre' => 'Kilogramo',
            'abreviatura' => 'kg',
            'tipo' => 'fraccionario',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $this->service->crear([
            'tenant_id' => $tenant->id,
            'nombre' => 'Kilogramo Dos',
            'abreviatura' => 'kg',
            'tipo' => 'fraccionario',
        ]);
    }

    public function test_listar_activas_solo_del_tenant(): void
    {
        $tenantA = Tenant::create(['nombre' => 'A', 'pais' => 'MX']);
        $tenantB = Tenant::create(['nombre' => 'B', 'pais' => 'MX']);

        app(TenantContext::class)->set($tenantA);
        $this->service->crear(['tenant_id' => $tenantA->id, 'nombre' => 'Kg A', 'abreviatura' => 'kg', 'tipo' => 'fraccionario']);

        app(TenantContext::class)->set($tenantB);
        $this->service->crear(['tenant_id' => $tenantB->id, 'nombre' => 'Kg B', 'abreviatura' => 'kg', 'tipo' => 'fraccionario']);

        app(TenantContext::class)->set($tenantA);
        $activas = $this->service->listarActivas($tenantA->id);

        $this->assertCount(1, $activas);
        $this->assertSame('Kg A', $activas->first()->nombre);
    }

    public function test_eliminar_lanza_excepcion_si_esta_en_uso(): void
    {
        $tenant = Tenant::create(['nombre' => 'Test', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant);

        $unidad = $this->service->crear([
            'tenant_id' => $tenant->id,
            'nombre' => 'Unidad',
            'abreviatura' => 'und',
            'tipo' => 'entero',
        ]);

        // Simular que una variante usa esta unidad
        $categoria = \App\Modules\Inventario\Models\Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Test']);
        $producto = \App\Modules\Inventario\Models\Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Producto Test', 'precio_compra' => 10, 'precio_venta' => 20,
        ]);
        \App\Modules\Inventario\Models\ProductoVariante::create([
            'producto_id' => $producto->id,
            'unidad_medida_id' => $unidad->id,
        ]);

        $this->expectException(UnidadEnUsoException::class);
        $this->service->eliminar($unidad->id);
    }
}
