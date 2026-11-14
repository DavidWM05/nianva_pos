<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * Decision del responsable: todo usuario de un tenant tiene al menos un rol. Sin rol entra
 * al sistema pero no ve nada.
 */
class UsuarioRolMinimoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private const MENSAJE = 'Asigna al menos un rol al usuario.';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['usuarios.crear', 'usuarios.editar']);
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function payload(array $extra = []): array
    {
        return array_merge([
            'nombre' => 'Nuevo',
            'correo' => uniqid('rol-minimo-').'@test.com',
            'password' => 'password-valida-123',
        ], $extra);
    }

    public function test_crear_sin_roles_da_422_en_roles(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/usuarios', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['roles' => self::MENSAJE]);
    }

    public function test_crear_con_roles_vacios_da_422_en_roles(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/usuarios', $this->payload(['roles' => []]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['roles' => self::MENSAJE]);
    }

    public function test_crear_con_un_rol_valido_sigue_funcionando(): void
    {
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/usuarios', $this->payload(['roles' => [$rol->id]]))
            ->assertCreated();

        $creado = Usuario::query()->findOrFail($respuesta->json('data.id'));
        $this->assertSame([$rol->id], $creado->roles()->pluck('roles.id')->all());
    }

    public function test_editar_con_roles_vacios_da_422_y_conserva_los_roles(): void
    {
        $objetivo = Usuario::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $objetivo->roles()->sync([$rol->id]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/usuarios/{$objetivo->id}", [
            'nombre' => $objetivo->nombre,
            'correo' => $objetivo->correo,
            'roles' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['roles' => self::MENSAJE]);

        $this->assertSame([$rol->id], $objetivo->roles()->pluck('roles.id')->all());
    }

    public function test_editar_sin_mandar_roles_conserva_los_que_tenia(): void
    {
        $objetivo = Usuario::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $objetivo->roles()->sync([$rol->id]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/usuarios/{$objetivo->id}", [
            'nombre' => 'Renombrado',
            'correo' => $objetivo->correo,
        ])->assertOk();

        $this->assertSame([$rol->id], $objetivo->roles()->pluck('roles.id')->all());
    }
}
