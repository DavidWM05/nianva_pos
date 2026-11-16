<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReglasCombinablesApiTest extends TestCase
{
    use RefreshDatabase;

    private function autenticar(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach (['reglas_precio.crear', 'reglas_precio.editar', 'reglas_precio.ver', 'configuracion.editar'] as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::factory()->create(compact('nombre', 'modulo', 'accion')));
        }
        $usuario->roles()->attach($rol);
        $this->actingAs($usuario);
    }

    public function test_guarda_y_expone_prioridad_y_combinable_sin_reiniciarlos_si_no_se_envian(): void
    {
        $this->autenticar();
        $datos = ['nombre' => 'Regla', 'tipo' => 'porcentaje', 'porcentaje' => 10, 'aplica_a' => 'todo'];
        $respuesta = $this->postJson('/api/v1/reglas-precio', $datos + ['prioridad' => 7, 'combinable' => true]);
        $respuesta->assertCreated()->assertJsonPath('data.prioridad', 7)->assertJsonPath('data.combinable', true);
        $id = $respuesta->json('data.id');
        $this->putJson('/api/v1/reglas-precio/'.$id, $datos)->assertOk()->assertJsonPath('data.prioridad', 7)->assertJsonPath('data.combinable', true);
        $this->putJson('/api/v1/reglas-precio/'.$id, $datos + ['prioridad' => 0, 'combinable' => false])->assertOk()->assertJsonPath('data.prioridad', 0)->assertJsonPath('data.combinable', false);
    }

    #[DataProvider('prioridadesInvalidas')]
    public function test_rechaza_prioridades_fuera_de_unsigned_small_integer(int|float $prioridad): void
    {
        $this->autenticar();
        $this->postJson('/api/v1/reglas-precio', ['nombre' => 'Inválida', 'tipo' => 'porcentaje', 'porcentaje' => 10, 'aplica_a' => 'todo', 'prioridad' => $prioridad])->assertUnprocessable()->assertJsonValidationErrors('prioridad');
    }

    public static function prioridadesInvalidas(): array
    {
        return [[-1], [0.5], [65536]];
    }

    public function test_la_configuracion_expone_true_por_defecto_y_permite_apagarlo(): void
    {
        $this->autenticar();
        $respuesta = $this->getJson('/api/v1/configuracion');
        $respuesta->assertOk()->assertJsonPath('data.cupon_combinable_con_promociones', true);
        $datos = $respuesta->json('data');
        unset($datos['backup_ultimo']);
        $datos['cupon_combinable_con_promociones'] = false;
        $this->putJson('/api/v1/configuracion', $datos)->assertOk()->assertJsonPath('data.cupon_combinable_con_promociones', false);
    }
}
