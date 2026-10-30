<?php

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class UnicidadProductoVarianteTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['inventario.crear']);
        $this->darPermisosA($this->usuarioB, ['inventario.crear']);
    }

    public function test_dos_tenants_pueden_usar_el_mismo_codigo_de_barras(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson("/api/productos/{$this->producto->id}/variantes", [
            'codigo_barras' => 'DUP-001',
            'talla' => 'S',
        ])->assertCreated();

        app(TenantContext::class)->set($this->tenantB);
        $this->actingAs($this->usuarioB);

        $this->postJson("/api/productos/{$this->productoB->id}/variantes", [
            'codigo_barras' => 'DUP-001',
            'talla' => 'S',
        ])->assertCreated();

        app(TenantContext::class)->set($this->tenant);
        $this->actingAs($this->usuario);

        $this->postJson("/api/productos/{$this->producto->id}/variantes", [
            'codigo_barras' => 'DUP-001',
            'talla' => 'M',
        ])->assertStatus(422)->assertJsonValidationErrors(['codigo_barras']);
    }

    public function test_la_busqueda_por_codigo_de_barras_solo_ve_el_tenant_activo(): void
    {
        app(TenantContext::class)->set($this->tenant);
        $varianteA = ProductoVariante::create([
            'producto_id' => $this->producto->id,
            'codigo_barras' => 'ISO-001',
        ]);

        app(TenantContext::class)->set($this->tenantB);
        $varianteB = ProductoVariante::create([
            'producto_id' => $this->productoB->id,
            'codigo_barras' => 'ISO-001',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $encontradaA = ProductoVariante::where('codigo_barras', 'ISO-001')->firstOrFail();

        app(TenantContext::class)->set($this->tenantB);
        $encontradaB = ProductoVariante::where('codigo_barras', 'ISO-001')->firstOrFail();

        $this->assertSame($varianteA->id, $encontradaA->id);
        $this->assertSame($varianteB->id, $encontradaB->id);
        $this->assertSame($this->tenant->id, $encontradaA->tenant_id);
        $this->assertSame($this->tenantB->id, $encontradaB->tenant_id);
    }

    public function test_una_variante_sin_tenant_id_hereda_el_del_producto(): void
    {
        $variante = ProductoVariante::create([
            'producto_id' => $this->producto->id,
            'codigo_barras' => 'HEREDA-001',
        ]);

        $this->assertSame($this->tenant->id, $variante->tenant_id);
    }

    public function test_una_variante_con_tenant_distinto_al_producto_falla(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        ProductoVariante::create([
            'tenant_id' => $this->tenantB->id,
            'producto_id' => $this->producto->id,
            'codigo_barras' => 'INVALIDO-001',
        ]);
    }
}
