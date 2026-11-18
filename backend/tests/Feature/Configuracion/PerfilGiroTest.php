<?php

declare(strict_types=1);

namespace Tests\Feature\Configuracion;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * ARQ-07: el giro es configuracion. Los perfiles son datos; aplicarlos siembra lo que falte sin
 * duplicar (tampoco contra las unidades globales) y deja el perfil del tenant.
 */
class PerfilGiroTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($this->tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => 'configuracion.editar'], ['modulo' => 'configuracion', 'accion' => 'editar'])->id);
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);
    }

    /** @return array{atributos: int, valores: int, categorias: int, unidades: int} */
    private function conteos(): array
    {
        return [
            'atributos' => Atributo::sinTenant()->where('tenant_id', $this->tenant->id)->count(),
            'valores' => AtributoValor::sinTenant()->whereIn('atributo_id', Atributo::sinTenant()->where('tenant_id', $this->tenant->id)->select('id'))->count(),
            'categorias' => Categoria::sinTenant()->where('tenant_id', $this->tenant->id)->count(),
            'unidades' => UnidadMedida::sinTenant()->where('tenant_id', $this->tenant->id)->count(),
        ];
    }

    public function test_lista_los_perfiles_con_generico_primero_y_el_actual(): void
    {
        $this->getJson('/api/v1/perfiles-giro')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.clave', 'generico')
            ->assertJsonPath('meta.actual', 'generico');
    }

    public function test_aplicar_ropa_calzado_siembra_atributos_categorias_y_unidad(): void
    {
        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => 'ropa-calzado'])
            ->assertOk()
            ->assertJsonPath('meta.actual', 'ropa-calzado')
            ->assertJsonPath('meta.creados.atributos', 2);

        $nombres = Atributo::query()->orderBy('orden')->pluck('nombre')->all();
        $this->assertSame(['Talla', 'Color'], $nombres);
        $this->assertSame(['CH', 'M', 'G', 'XG'], Atributo::query()->where('nombre', 'Talla')->firstOrFail()->valores()->pluck('valor')->all());
        $this->assertSame(['Accesorios', 'Calzado', 'Ropa'], Categoria::query()->orderBy('nombre')->pluck('nombre')->all());
        $this->assertSame([], UnidadMedida::sinTenant()->where('tenant_id', $this->tenant->id)->pluck('abreviatura')->all());
        $this->assertSame('ropa-calzado', ConfiguracionTenant::sinTenant()->where('tenant_id', $this->tenant->id)->firstOrFail()->perfil_giro);
    }

    public function test_aplicar_el_perfil_dos_veces_no_duplica(): void
    {
        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => 'ferreteria'])->assertOk();
        $primera = $this->conteos();

        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => 'ferreteria'])
            ->assertOk()
            ->assertJsonPath('meta.creados', ['atributos' => 0, 'valores' => 0, 'categorias' => 0, 'unidades' => 0]);
        $this->assertSame($primera, $this->conteos());
    }

    public function test_no_crea_una_unidad_que_ya_existe_global(): void
    {
        UnidadMedida::sinTenant()->create(['tenant_id' => null, 'nombre' => 'Kilogramo', 'abreviatura' => 'kg', 'tipo' => 'fraccionario', 'activo' => true]);
        UnidadMedida::sinTenant()->create(['tenant_id' => null, 'nombre' => 'Litro', 'abreviatura' => 'l', 'tipo' => 'fraccionario', 'activo' => true]);

        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => 'abarrotes'])
            ->assertOk()
            ->assertJsonPath('meta.creados.unidades', 0);
        $this->assertSame([], UnidadMedida::sinTenant()->where('tenant_id', $this->tenant->id)->pluck('abreviatura')->all());
    }

    public function test_un_perfil_desconocido_se_rechaza(): void
    {
        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => 'inventado'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['perfil']);
    }

    public function test_el_comando_aplica_el_perfil(): void
    {
        $this->artisan('giro:aplicar', ['tenant' => $this->tenant->id, 'perfil' => 'abarrotes'])->assertSuccessful();
        $this->artisan('giro:aplicar', ['tenant' => $this->tenant->id, 'perfil' => 'inventado'])->assertFailed();

        $this->assertSame('abarrotes', ConfiguracionTenant::sinTenant()->where('tenant_id', $this->tenant->id)->firstOrFail()->perfil_giro);
        $this->assertSame(3, Categoria::sinTenant()->where('tenant_id', $this->tenant->id)->count());
    }
}
