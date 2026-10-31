<?php

namespace Tests\Feature\Configuracion;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ConfiguracionEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['configuracion.editar']);
    }

    public function test_actualizar_configuracion_sin_mensaje_ni_logo_conserva_sus_valores(): void
    {
        $configuracion = ConfiguracionTenant::where('tenant_id', $this->tenant->id)->firstOrFail();
        $configuracion->update([
            'mensaje_ticket' => 'Mensaje original',
            'logo_url' => 'https://ejemplo.com/logo-original.png',
        ]);

        $this->actingAs($this->usuario);

        $this->putJson('/api/configuracion', [
            'moneda' => 'USD',
            'mostrar_rfc' => true,
            'mostrar_telefono' => true,
            'mostrar_correo' => true,
            'backup_auto' => false,
            'backup_frecuencia' => 'diario',
            'codigo_barras_automatico' => false,
        ])->assertOk();

        $configuracion->refresh();
        $this->assertSame('USD', $configuracion->moneda);
        $this->assertSame('Mensaje original', $configuracion->mensaje_ticket);
        $this->assertSame('https://ejemplo.com/logo-original.png', $configuracion->logo_url);
    }
}
