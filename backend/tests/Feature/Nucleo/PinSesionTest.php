<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PinSesionTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_pin_propio_desbloquea_la_sesion_sin_cambiar_de_usuario(): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);
        $usuario = Usuario::factory()->create(['password' => 'password-valida-123'])->refresh();
        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/');

        $this->putJson('/api/v1/sesion/pin', ['password_actual' => 'incorrecta', 'pin' => '7049'])
            ->assertUnprocessable();
        $this->putJson('/api/v1/sesion/pin', ['password_actual' => 'password-valida-123', 'pin' => '1234'])
            ->assertUnprocessable();
        $this->putJson('/api/v1/sesion/pin', ['password_actual' => 'password-valida-123', 'pin' => '7049'])
            ->assertNoContent();

        $hash = $usuario->refresh()->getAttribute('pin_caja_hash');
        $this->assertNotSame('7049', $hash);
        $this->assertTrue(Hash::check('7049', $hash));
        $this->assertArrayNotHasKey('pin_caja_hash', $usuario->toArray());

        $this->postJson('/api/v1/sesion/bloquear')->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());
        $this->getJson('/api/v1/sesion')->assertStatus(423)->assertJsonPath('error_code', 'sesion_bloqueada');
        $this->putJson('/api/v1/sesion/pin', ['password_actual' => 'password-valida-123', 'pin' => '5471'])->assertStatus(423);
        $this->postJson('/api/v1/sesion/desbloquear', ['pin' => '1234'])->assertUnprocessable();
        $this->postJson('/api/v1/sesion/desbloquear', ['pin' => '7049', 'usuario_id' => 999])->assertNoContent();
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.usuario.id', $usuario->id);
    }

    public function test_cinco_intentos_fallidos_se_auditan_y_cierran_la_sesion(): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);
        $usuario = Usuario::factory()->create(['password' => 'password-valida-123'])->refresh();
        $this->withHeader('Referer', 'http://localhost:4200/')->withCredentials();
        $this->postJson('/login', ['correo' => $usuario->correo, 'password' => 'password-valida-123'])->assertOk();
        $this->withCookie(session()->getName(), session()->getId());
        $this->putJson('/api/v1/sesion/pin', ['password_actual' => 'password-valida-123', 'pin' => '7049'])->assertNoContent();
        $this->postJson('/api/v1/sesion/bloquear')->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());

        for ($intento = 1; $intento < 5; $intento++) {
            $this->postJson('/api/v1/sesion/desbloquear', ['pin' => '1111'])
                ->assertUnprocessable()->assertJsonPath('error_code', 'pin_caja_incorrecto');
        }

        $this->postJson('/api/v1/sesion/desbloquear', ['pin' => '1111'])
            ->assertTooManyRequests()->assertJsonPath('error_code', 'pin_caja_intentos_agotados');
        Auth::forgetGuards();
        $this->getJson('/api/v1/sesion')->assertUnauthorized();
        $this->assertSame(5, DB::table('auditoria')->where('cambios->pin_caja->resultado', 'intento_fallido')->count());
        $this->assertDatabaseHas('auditoria', [
            'usuario_id' => $usuario->id,
            'tabla_afectada' => 'usuarios',
            'cambios' => '{"pin_caja":{"resultado":"intento_fallido"}}',
        ]);
    }

    public function test_consultar_la_api_bloqueada_no_renueva_la_sesion(): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);
        $usuario = Usuario::factory()->create(['password' => 'password-valida-123'])->refresh();
        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/')->withCredentials();
        $this->putJson('/api/v1/sesion/pin', ['password_actual' => 'password-valida-123', 'pin' => '7049'])->assertNoContent();
        $this->postJson('/api/v1/sesion/bloquear')->assertNoContent();
        $this->withCookie(session()->getName(), session()->getId());

        $this->travel(29)->minutes();
        $this->getJson('/api/v1/sesion')->assertStatus(423);
        $this->travel(2)->minutes();
        $this->getJson('/api/v1/sesion')->assertUnauthorized()->assertJsonPath('error_code', 'sesion_inactiva');
    }
}
