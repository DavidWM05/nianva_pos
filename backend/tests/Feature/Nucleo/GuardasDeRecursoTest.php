<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Rol;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class GuardasDeRecursoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['roles.editar', 'metodos_pago.editar', 'configuracion.editar']);
    }

    public function test_rol_de_sistema_con_payload_invalido_responde_403_antes_de_422(): void
    {
        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/roles/{$rol->id}", ['nombre' => ''])
            ->assertForbidden()
            ->assertJsonPath('message', 'Este es un rol de sistema y solo un superadmin puede modificarlo.')
            ->assertJsonMissingPath('errors');
    }

    public function test_metodo_de_pago_global_con_payload_invalido_responde_403_antes_de_422(): void
    {
        $metodo = MetodoPago::create(['tenant_id' => null, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/metodos-pago/{$metodo->id}", [
            'nombre' => '',
            'tipo' => 'invalido',
            'incluir_en_financiero' => 'no-es-booleano',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Este es un método de pago global y no se puede modificar.')
            ->assertJsonMissingPath('errors');
    }

    public function test_tenant_sin_configuracion_con_payload_invalido_responde_404_antes_de_422(): void
    {
        ConfiguracionTenant::where('tenant_id', $this->tenant->id)->delete();
        $this->actingAs($this->usuario);

        $this->putJson('/api/v1/configuracion', [
            'moneda' => '',
            'backup_frecuencia' => 'nunca',
        ])
            ->assertNotFound()
            ->assertJsonPath('message', 'No hay un tenant activo.')
            ->assertJsonMissingPath('errors');
    }
}
