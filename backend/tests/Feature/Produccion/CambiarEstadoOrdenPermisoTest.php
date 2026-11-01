<?php

namespace Tests\Feature\Produccion;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CambiarEstadoOrdenPermisoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['produccion.crear']);
    }

    public function test_cambiar_estado_exige_produccion_completar(): void
    {
        $this->actingAs($this->usuario)
            ->patchJson('/api/v1/ordenes-produccion/999999/estado', [
                'estado' => 'completada',
                'cantidad_producida' => 1,
            ])
            ->assertForbidden();
    }

    public function test_cambiar_estado_funciona_con_produccion_completar(): void
    {
        $usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Usuario completar',
            'correo' => uniqid('completar-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'produccion.completar'],
            ['modulo' => 'produccion', 'accion' => 'completar'],
        );

        $rol = Rol::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'completar-'.uniqid(),
            'es_sistema' => false,
        ]);
        $rol->permisos()->attach($permiso->id);
        $usuario->roles()->attach($rol->id);

        $respuesta = $this->actingAs($usuario)->patchJson('/api/v1/ordenes-produccion/999999/estado', [
            'estado' => 'completada',
            'cantidad_producida' => 1,
        ]);

        $this->assertNotSame(403, $respuesta->getStatusCode());
    }
}
