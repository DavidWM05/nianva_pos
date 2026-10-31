<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Exceptions\SucursalNoPermitidaException;
use App\Modules\Nucleo\Exceptions\SucursalRequeridaException;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class SucursalOperacionTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private Sucursal $sucursalExtra;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([]);
        $this->sucursalExtra = Sucursal::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Norte A',
        ]);
    }

    public function test_escritura_usa_la_sucursal_del_usuario_si_no_se_solicita(): void
    {
        $this->assertSame(
            $this->sucursal->id,
            SucursalOperacion::paraEscritura($this->usuario, null),
        );
    }

    public function test_escritura_acepta_la_misma_sucursal_sin_permiso_especial(): void
    {
        $this->assertSame(
            $this->sucursal->id,
            SucursalOperacion::paraEscritura($this->usuario, $this->sucursal->id),
        );
    }

    public function test_escritura_rechaza_otra_sucursal_del_mismo_tenant_sin_permiso(): void
    {
        $this->assertSucursalNoPermitida(
            fn () => SucursalOperacion::paraEscritura($this->usuario, $this->sucursalExtra->id),
            $this->sucursalExtra->id,
        );
    }

    public function test_escritura_acepta_otra_sucursal_del_mismo_tenant_con_permiso_todas(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $this->assertSame(
            $this->sucursalExtra->id,
            SucursalOperacion::paraEscritura($this->usuario, $this->sucursalExtra->id),
        );
    }

    public function test_escritura_rechaza_sucursal_de_otro_tenant_aun_con_permiso_todas(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $this->assertSucursalNoPermitida(
            fn () => SucursalOperacion::paraEscritura($this->usuario, $this->sucursalB->id),
            $this->sucursalB->id,
        );
    }

    public function test_escritura_exige_sucursal_cuando_usuario_no_tiene_y_no_se_solicita(): void
    {
        $usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => null,
            'nombre' => 'Sin Sucursal',
            'correo' => uniqid('sin-sucursal-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        $this->expectException(SucursalRequeridaException::class);

        SucursalOperacion::paraEscritura($usuario, null);
    }

    public function test_filtro_sin_permiso_todas_ignora_la_sucursal_solicitada(): void
    {
        $this->assertSame(
            $this->sucursal->id,
            SucursalOperacion::paraFiltro($this->usuario, $this->sucursalExtra->id),
        );
    }

    public function test_filtro_sin_permiso_todas_ni_sucursal_propia_no_abre_todas_las_sucursales(): void
    {
        $usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => null,
            'nombre' => 'Sin Sucursal',
            'correo' => uniqid('sin-sucursal-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        $this->expectException(SucursalRequeridaException::class);

        SucursalOperacion::paraFiltro($usuario, $this->sucursalExtra->id);
    }

    public function test_filtro_con_permiso_todas_respeta_la_sucursal_solicitada(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $this->assertSame(
            $this->sucursalExtra->id,
            SucursalOperacion::paraFiltro($this->usuario, $this->sucursalExtra->id),
        );
    }

    public function test_filtro_con_permiso_todas_sin_sucursal_devuelve_todas(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $this->assertNull(SucursalOperacion::paraFiltro($this->usuario, null));
    }

    public function test_filtro_con_permiso_todas_ignora_sucursal_de_otro_tenant(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $this->assertSame(
            $this->sucursal->id,
            SucursalOperacion::paraFiltro($this->usuario, $this->sucursalB->id),
        );
    }

    private function assertSucursalNoPermitida(callable $accion, int $sucursalId): void
    {
        try {
            $accion();
            $this->fail('Se esperaba SucursalNoPermitidaException.');
        } catch (SucursalNoPermitidaException $excepcion) {
            $this->assertSame('sucursal_no_permitida', $excepcion->errorCode());
            $this->assertSame(422, $excepcion->status());
            $this->assertSame(['sucursal_id' => $sucursalId], $excepcion->contexto());
        }
    }
}
