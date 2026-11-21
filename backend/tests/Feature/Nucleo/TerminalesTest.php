<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TerminalesTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_administrador_gestiona_terminales_y_la_sesion_lee_la_terminal_de_su_sucursal(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $sucursal = Sucursal::factory()->create();
        $otra = Sucursal::factory()->create(['tenant_id' => $sucursal->tenant_id]);
        $admin = Usuario::factory()->admin()->create(['tenant_id' => $sucursal->tenant_id, 'sucursal_id' => $sucursal->id]);
        $admin->forceFill(['two_factor_confirmed_at' => now()])->save();

        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->actingAs($admin->refresh())->withHeader('Referer', 'http://localhost:4200/');
        $primera = $this->postJson('/api/v1/terminales', ['nombre' => 'Caja norte', 'sucursal_id' => $sucursal->id])->assertCreated()->json('data.id');
        $ajena = $this->postJson('/api/v1/terminales', ['nombre' => 'Caja sur', 'sucursal_id' => $otra->id])->assertCreated()->json('data.id');
        $this->getJson('/api/v1/terminales')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/v1/terminales/{$primera}")->assertOk()->assertJsonPath('data.nombre', 'Caja norte');
        $this->putJson("/api/v1/terminales/{$primera}", ['nombre' => 'Caja principal', 'sucursal_id' => $sucursal->id])
            ->assertOk()->assertJsonPath('data.nombre', 'Caja principal');

        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $ajena])
            ->assertUnprocessable()->assertJsonValidationErrors('terminal_id');
        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $primera])->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.terminal.id', $primera);
        $this->deleteJson("/api/v1/terminales/{$primera}")->assertNoContent();
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.terminal', null);
    }

    public function test_un_usuario_sin_permiso_no_puede_dar_de_alta_una_terminal(): void
    {
        $usuario = Usuario::factory()->create();
        $this->actingAs($usuario);

        $this->postJson('/api/v1/terminales', ['nombre' => 'Caja', 'sucursal_id' => $usuario->sucursal_id])
            ->assertForbidden();
    }

    public function test_el_binding_numerico_no_expone_terminales_de_otro_tenant(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $sucursal = Sucursal::factory()->create();
        $admin = Usuario::factory()->admin()->create(['tenant_id' => $sucursal->tenant_id, 'sucursal_id' => $sucursal->id]);
        $admin->forceFill(['two_factor_confirmed_at' => now()])->save();
        $otro = Usuario::factory()->admin()->create();
        $otro->forceFill(['two_factor_confirmed_at' => now()])->save();

        $this->actingAs($admin->refresh());
        $id = $this->postJson('/api/v1/terminales', ['nombre' => 'Caja', 'sucursal_id' => $sucursal->id])
            ->assertCreated()->json('data.id');
        $this->assertIsInt($id);

        $this->actingAs($otro->refresh());
        $this->getJson("/api/v1/terminales/{$id}")->assertNotFound();
        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $id])
            ->assertUnprocessable()->assertJsonValidationErrors('terminal_id');
        $this->putJson("/api/v1/terminales/{$id}", ['nombre' => 'Tercero', 'sucursal_id' => $otro->sucursal_id])->assertNotFound();
        $this->deleteJson("/api/v1/terminales/{$id}")->assertNotFound();
    }
}
