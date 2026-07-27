<?php

namespace Tests\Feature\Configuracion;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfiguracionControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, usuario: Usuario}
     */
    private function crearUsuarioConPermisos(array $permisos): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => uniqid('ana-').'@test.com', 'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($tenant);

        if ($permisos !== []) {
            $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-de-prueba-'.uniqid(), 'es_sistema' => false]);
            $ids = collect($permisos)->map(function (string $nombre) {
                [$modulo, $accion] = explode('.', $nombre);

                return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
            });
            $rol->permisos()->attach($ids);
            $usuario->roles()->attach($rol->id);
        }

        return compact('tenant', 'usuario');
    }

    public function test_show_devuelve_la_configuracion_sembrada_al_crear_el_tenant(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['configuracion.editar']);
        $this->actingAs($usuario);

        $this->getJson('/api/configuracion')->assertOk()
            ->assertJsonPath('data.moneda', '$')
            ->assertJsonPath('data.mostrar_rfc', true)
            ->assertJsonPath('data.backup_frecuencia', 'semanal');
    }

    public function test_show_sin_permiso_devuelve_403(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/configuracion')->assertForbidden();
    }

    public function test_update_guarda_los_nuevos_valores(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['configuracion.editar']);
        $this->actingAs($usuario);

        $respuesta = $this->putJson('/api/configuracion', [
            'moneda' => 'USD',
            'mensaje_ticket' => 'Gracias por su compra',
            'logo_url' => 'https://ejemplo.com/logo.png',
            'mostrar_rfc' => false,
            'mostrar_telefono' => true,
            'mostrar_correo' => false,
            'backup_auto' => true,
            'backup_frecuencia' => 'diario',
            'codigo_barras_automatico' => true,
        ]);

        $respuesta->assertOk()
            ->assertJsonPath('data.moneda', 'USD')
            ->assertJsonPath('data.mostrar_rfc', false)
            ->assertJsonPath('data.backup_frecuencia', 'diario')
            ->assertJsonPath('data.codigo_barras_automatico', true);

        $this->assertDatabaseHas('configuracion_tenant', ['tenant_id' => $tenant->id, 'moneda' => 'USD', 'backup_auto' => true]);
    }

    public function test_update_rechaza_una_frecuencia_de_backup_invalida(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['configuracion.editar']);
        $this->actingAs($usuario);

        $this->putJson('/api/configuracion', [
            'moneda' => '$',
            'mostrar_rfc' => true,
            'mostrar_telefono' => true,
            'mostrar_correo' => true,
            'backup_auto' => false,
            'backup_frecuencia' => 'nunca',
            'codigo_barras_automatico' => false,
        ])->assertUnprocessable()->assertJsonValidationErrors('backup_frecuencia');
    }

    public function test_update_sin_permiso_devuelve_403(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->putJson('/api/configuracion', ['moneda' => 'USD'])->assertForbidden();
    }

    public function test_aislamiento_entre_tenants(): void
    {
        ['tenant' => $tenant1, 'usuario' => $usuario1] = $this->crearUsuarioConPermisos(['configuracion.editar']);
        $this->actingAs($usuario1);
        $this->putJson('/api/configuracion', [
            'moneda' => 'USD', 'mostrar_rfc' => true, 'mostrar_telefono' => true, 'mostrar_correo' => true,
            'backup_auto' => false, 'backup_frecuencia' => 'diario', 'codigo_barras_automatico' => false,
        ])->assertOk();

        ['usuario' => $usuario2] = $this->crearUsuarioConPermisos(['configuracion.editar']);
        $this->actingAs($usuario2);

        $this->getJson('/api/configuracion')->assertOk()->assertJsonPath('data.moneda', '$');

        $this->assertSame(2, ConfiguracionTenant::sinTenant()->count());
    }

    public function test_publica_expone_solo_codigo_barras_automatico_sin_permiso_dedicado(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        ConfiguracionTenant::where('tenant_id', $tenant->id)->update(['codigo_barras_automatico' => true]);
        $this->actingAs($usuario);

        // inventario.crear, NO configuracion.editar -- publica() es
        // deliberadamente accesible sin ese permiso (ver su docblock).
        $this->getJson('/api/configuracion/publica')
            ->assertOk()
            ->assertExactJson(['codigo_barras_automatico' => true]);
    }
}
