<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DAT-02b: reglas de precio y cupones guardan el porcentaje y el monto en columnas propias
 * (`porcentaje` decimal(7,4), `monto` decimal(12,2)). Cada tipo usa la suya: porcentaje solo
 * con tipo porcentaje, monto solo con monto_fijo, nxm y bundle sin ninguno. El campo que no
 * toca llega null o ausente; con valor responde 422.
 */
class ValorSeparadoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    /**
     * @param  list<string>  $permisos
     */
    private function actorCon(array $permisos): Usuario
    {
        $this->tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($this->tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        foreach ($permisos as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);

        return $usuario;
    }

    /** @param  array<string, mixed>  $datos */
    private function regla(array $datos): array
    {
        return array_merge(['nombre' => 'Regla', 'aplica_a' => 'todo'], $datos);
    }

    /** @param  array<string, mixed>  $datos */
    private function cupon(array $datos): array
    {
        return array_merge(['codigo' => 'C-'.uniqid(), 'nombre' => 'Cupon'], $datos);
    }

    public function test_regla_de_porcentaje_guarda_y_devuelve_la_tasa_con_cuatro_decimales(): void
    {
        $this->actorCon(['reglas_precio.crear']);

        $respuesta = $this->postJson('/api/v1/reglas-precio', $this->regla(['tipo' => 'porcentaje', 'porcentaje' => '12.3456']))
            ->assertCreated()
            ->assertJsonPath('data.porcentaje', '12.3456')
            ->assertJsonPath('data.monto', null)
            ->assertJsonMissingPath('data.valor');

        $regla = ReglaPrecio::query()->findOrFail($respuesta->json('data.id'));
        $this->assertSame('12.3456', (string) $regla->getAttribute('porcentaje'));
        $this->assertNull($regla->getAttribute('monto'));
    }

    public function test_regla_de_monto_fijo_guarda_y_devuelve_el_monto_en_d2(): void
    {
        $this->actorCon(['reglas_precio.crear']);

        $this->postJson('/api/v1/reglas-precio', $this->regla(['tipo' => 'monto_fijo', 'monto' => '25.5']))
            ->assertCreated()
            ->assertJsonPath('data.monto', '25.50')
            ->assertJsonPath('data.porcentaje', null);
    }

    public function test_regla_nxm_y_bundle_no_guardan_porcentaje_ni_monto(): void
    {
        $this->actorCon(['reglas_precio.crear']);

        $this->postJson('/api/v1/reglas-precio', $this->regla(['tipo' => 'nxm', 'cantidad_compra' => 3, 'cantidad_paga' => 2]))
            ->assertCreated()
            ->assertJsonPath('data.porcentaje', null)
            ->assertJsonPath('data.monto', null);
        $this->postJson('/api/v1/reglas-precio', $this->regla(['tipo' => 'bundle', 'cantidad_compra' => 3, 'precio_bundle' => 200, 'porcentaje' => null, 'monto' => null]))
            ->assertCreated()
            ->assertJsonPath('data.porcentaje', null)
            ->assertJsonPath('data.monto', null);
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function reglasConElCampoQueNoToca(): array
    {
        return [
            'porcentaje con monto' => [['tipo' => 'porcentaje', 'porcentaje' => 10, 'monto' => 5], 'monto'],
            'monto fijo con porcentaje' => [['tipo' => 'monto_fijo', 'monto' => 5, 'porcentaje' => 10], 'porcentaje'],
            'nxm con porcentaje' => [['tipo' => 'nxm', 'cantidad_compra' => 3, 'cantidad_paga' => 2, 'porcentaje' => 10], 'porcentaje'],
            'bundle con monto' => [['tipo' => 'bundle', 'cantidad_compra' => 3, 'precio_bundle' => 200, 'monto' => 5], 'monto'],
        ];
    }

    /** @param  array<string, mixed>  $datos */
    #[DataProvider('reglasConElCampoQueNoToca')]
    public function test_regla_con_el_campo_que_no_toca_responde_422(array $datos, string $campo): void
    {
        $this->actorCon(['reglas_precio.crear']);

        $this->postJson('/api/v1/reglas-precio', $this->regla($datos))
            ->assertUnprocessable()
            ->assertJsonValidationErrors($campo);
        $this->assertSame(0, ReglaPrecio::query()->count());
    }

    public function test_el_mensaje_del_campo_que_no_toca_dice_que_va_vacio(): void
    {
        $this->actorCon(['reglas_precio.crear', 'cupones.crear']);

        $this->postJson('/api/v1/reglas-precio', $this->regla(['tipo' => 'porcentaje', 'porcentaje' => 10, 'monto' => 5]))
            ->assertJsonPath('errors.monto.0', 'El monto solo aplica a reglas de monto fijo; envíalo vacío.');
        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'monto_fijo', 'monto' => 5, 'porcentaje' => 10]))
            ->assertJsonPath('errors.porcentaje.0', 'El porcentaje solo aplica a cupones de porcentaje; envíalo vacío.');
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function valoresFueraDeRango(): array
    {
        return [
            'porcentaje sobre 100' => [['tipo' => 'porcentaje', 'porcentaje' => '100.0001'], 'porcentaje'],
            'porcentaje negativo' => [['tipo' => 'porcentaje', 'porcentaje' => -1], 'porcentaje'],
            'porcentaje con 5 decimales' => [['tipo' => 'porcentaje', 'porcentaje' => '10.12345'], 'porcentaje'],
            'porcentaje faltante' => [['tipo' => 'porcentaje'], 'porcentaje'],
            'monto negativo' => [['tipo' => 'monto_fijo', 'monto' => -1], 'monto'],
            'monto con 3 decimales' => [['tipo' => 'monto_fijo', 'monto' => '1.005'], 'monto'],
            'monto faltante' => [['tipo' => 'monto_fijo'], 'monto'],
        ];
    }

    /** @param  array<string, mixed>  $datos */
    #[DataProvider('valoresFueraDeRango')]
    public function test_regla_y_cupon_validan_porcentaje_y_monto(array $datos, string $campo): void
    {
        $this->actorCon(['reglas_precio.crear', 'cupones.crear']);

        $this->postJson('/api/v1/reglas-precio', $this->regla($datos))
            ->assertUnprocessable()
            ->assertJsonValidationErrors($campo);
        $this->postJson('/api/v1/cupones', $this->cupon($datos))
            ->assertUnprocessable()
            ->assertJsonValidationErrors($campo);
    }

    public function test_los_limites_del_porcentaje_y_del_monto_se_aceptan(): void
    {
        $this->actorCon(['cupones.crear']);

        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'porcentaje', 'porcentaje' => 100]))
            ->assertCreated()
            ->assertJsonPath('data.porcentaje', '100.0000');
        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'porcentaje', 'porcentaje' => '0.0001']))
            ->assertCreated()
            ->assertJsonPath('data.porcentaje', '0.0001');
        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'monto_fijo', 'monto' => 0]))
            ->assertCreated()
            ->assertJsonPath('data.monto', '0.00')
            ->assertJsonPath('data.porcentaje', null);
    }

    public function test_cupon_con_el_campo_que_no_toca_responde_422(): void
    {
        $this->actorCon(['cupones.crear']);

        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'porcentaje', 'porcentaje' => 10, 'monto' => 5]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('monto');
        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'monto_fijo', 'monto' => 5, 'porcentaje' => 10]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('porcentaje');
        $this->assertSame(0, Cupon::query()->count());
    }

    public function test_cupon_de_monto_fijo_acepta_el_porcentaje_en_null(): void
    {
        $this->actorCon(['cupones.crear']);

        $this->postJson('/api/v1/cupones', $this->cupon(['tipo' => 'monto_fijo', 'monto' => '50', 'porcentaje' => null]))
            ->assertCreated()
            ->assertJsonPath('data.monto', '50.00')
            ->assertJsonPath('data.porcentaje', null)
            ->assertJsonMissingPath('data.valor');
    }

    public function test_editar_un_cupon_a_otro_tipo_limpia_el_campo_anterior(): void
    {
        $this->actorCon(['cupones.editar']);
        $cupon = Cupon::factory()->create(['tenant_id' => $this->tenant->id, 'tipo' => 'porcentaje', 'porcentaje' => 10]);

        $this->putJson("/api/v1/cupones/{$cupon->id}", ['codigo' => $cupon->codigo, 'nombre' => 'Fijo', 'tipo' => 'monto_fijo', 'monto' => 30])
            ->assertOk()
            ->assertJsonPath('data.monto', '30.00')
            ->assertJsonPath('data.porcentaje', null);

        $cupon->refresh();
        $this->assertNull($cupon->getAttribute('porcentaje'));
        $this->assertSame('30.00', (string) $cupon->getAttribute('monto'));
    }

    public function test_editar_un_cupon_sin_su_campo_responde_422(): void
    {
        $this->actorCon(['cupones.editar']);
        $cupon = Cupon::factory()->create(['tenant_id' => $this->tenant->id, 'tipo' => 'porcentaje', 'porcentaje' => 10]);

        $this->putJson("/api/v1/cupones/{$cupon->id}", ['codigo' => $cupon->codigo, 'nombre' => 'Fijo', 'tipo' => 'monto_fijo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('monto');
    }

    public function test_validar_cupon_expone_porcentaje_y_monto(): void
    {
        $this->actorCon(['ventas.crear']);
        Cupon::factory()->create(['tenant_id' => $this->tenant->id, 'codigo' => 'FIJO30', 'tipo' => 'monto_fijo', 'monto' => 30]);

        $this->postJson('/api/v1/cupones/validar', ['codigo' => 'FIJO30', 'total' => 200])
            ->assertOk()
            ->assertJsonPath('data.cupon.monto', '30.00')
            ->assertJsonPath('data.cupon.porcentaje', null)
            ->assertJsonMissingPath('data.cupon.valor')
            ->assertJsonPath('data.descuento', '30.00')
            ->assertJsonPath('data.total_con_descuento', '170.00');
    }

    public function test_las_factories_ponen_el_campo_que_toca_segun_el_tipo(): void
    {
        $tenant = Tenant::factory()->create();

        $porcentaje = ReglaPrecio::factory()->create(['tenant_id' => $tenant->id]);
        $monto = ReglaPrecio::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'monto_fijo']);
        $nxm = ReglaPrecio::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'nxm', 'cantidad_compra' => 3, 'cantidad_paga' => 2]);
        $cuponPorcentaje = Cupon::factory()->create(['tenant_id' => $tenant->id]);
        $cuponMonto = Cupon::factory()->create(['tenant_id' => $tenant->id, 'tipo' => 'monto_fijo']);

        $this->assertNotNull($porcentaje->getAttribute('porcentaje'));
        $this->assertNull($porcentaje->getAttribute('monto'));
        $this->assertNull($monto->getAttribute('porcentaje'));
        $this->assertNotNull($monto->getAttribute('monto'));
        $this->assertNull($nxm->getAttribute('porcentaje'));
        $this->assertNull($nxm->getAttribute('monto'));
        $this->assertNotNull($cuponPorcentaje->getAttribute('porcentaje'));
        $this->assertNull($cuponPorcentaje->getAttribute('monto'));
        $this->assertNull($cuponMonto->getAttribute('porcentaje'));
        $this->assertNotNull($cuponMonto->getAttribute('monto'));
    }
}
