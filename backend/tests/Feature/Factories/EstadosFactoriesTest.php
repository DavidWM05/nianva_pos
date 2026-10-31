<?php

namespace Tests\Feature\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstadosFactoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_usuario_admin_tiene_el_rol_admin(): void
    {
        $usuario = Usuario::factory()->admin()->create();

        $this->assertTrue($usuario->tieneRol('admin'));
    }

    public function test_usuario_vendedor_tiene_el_rol_vendedor(): void
    {
        $usuario = Usuario::factory()->vendedor()->create();

        $this->assertTrue($usuario->tieneRol('vendedor'));
    }

    public function test_usuario_superadmin_no_tiene_tenant_ni_sucursal(): void
    {
        $usuario = Usuario::factory()->superadmin()->create();

        $this->assertNull($usuario->tenant_id);
        $this->assertNull($usuario->sucursal_id);
    }

    public function test_venta_anulada(): void
    {
        $venta = Venta::factory()->anulada()->create();

        $this->assertSame('anulada', $venta->estado);
        $this->assertSame('Anulada en factory', $venta->motivo_anulacion);
        $this->assertNotNull($venta->fecha_anulacion);
    }

    public function test_apartado_liquidado(): void
    {
        $apartado = Apartado::factory()->liquidado()->create();

        $this->assertSame('completado', $apartado->estado);
        $this->assertSame((float) $apartado->total, (float) $apartado->total_abonado);
        $this->assertNotNull($apartado->fecha_completado);
    }

    public function test_caja_cerrada(): void
    {
        $caja = CajaSesion::factory()->cerrada()->create();

        $this->assertSame('cerrada', $caja->estado);
        $this->assertSame(0.0, (float) $caja->monto_cierre);
        $this->assertNotNull($caja->fecha_cierre);
    }

    public function test_metodo_pago_global(): void
    {
        $metodo = MetodoPago::factory()->global()->create();

        $this->assertNull($metodo->tenant_id);
    }

    public function test_rol_de_sistema(): void
    {
        $rol = Rol::factory()->sistema()->create();

        $this->assertNull($rol->tenant_id);
        $this->assertTrue($rol->es_sistema);
    }
}
