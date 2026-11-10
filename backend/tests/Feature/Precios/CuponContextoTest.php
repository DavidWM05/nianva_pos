<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Http\Requests\ValidarCuponRequest;
use App\Modules\Precios\Models\Cupon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CuponContextoTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('permisosDeSucursal')]
    public function test_usuario_sin_sucursal_valida_el_cupon_con_la_misma_respuesta(bool $todasLasSucursales): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => null]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        $nombres = $todasLasSucursales ? ['ventas.crear', 'sucursales.todas'] : ['ventas.crear'];
        foreach ($nombres as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $permiso = Permiso::factory()->create(['nombre' => $nombre, 'modulo' => $modulo, 'accion' => $accion]);
            $rol->permisos()->attach($permiso->id);
        }
        $usuario->roles()->attach($rol->id);
        $cupon = Cupon::factory()->create(['tenant_id' => $tenant->id, 'codigo' => 'SIN-SUCURSAL', 'nombre' => 'Descuento', 'tipo' => 'porcentaje', 'valor' => 10]);

        $this->actingAs($usuario)
            ->postJson('/api/v1/cupones/validar', ['codigo' => 'SIN-SUCURSAL', 'total' => 200])
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'cupon' => ['id' => $cupon->id, 'codigo' => 'SIN-SUCURSAL', 'nombre' => 'Descuento', 'tipo' => 'porcentaje', 'valor' => '10.00'],
                    'descuento' => 20,
                    'total_con_descuento' => 180,
                ],
            ]);
    }

    #[DataProvider('sucursalesDelUsuario')]
    public function test_el_dto_toma_la_sucursal_opcional_del_usuario_e_ignora_el_payload(bool $tieneSucursal): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $sucursalId = $tieneSucursal ? Sucursal::factory()->create(['tenant_id' => $tenant->id])->id : null;
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursalId]);
        $solicitada = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $request = ValidarCuponRequest::create('/api/v1/cupones/validar', 'POST', ['codigo' => 'PRUEBA', 'total' => 200, 'sucursal_id' => $solicitada->id]);
        $request->setUserResolver(static fn () => $usuario);
        $request->setValidator(Validator::make($request->all(), $request->rules()));

        $dto = $request->toDto();

        $this->assertSame(['codigo' => 'PRUEBA', 'total' => 200.0, 'sucursalId' => $sucursalId], get_object_vars($dto));
    }

    public static function sucursalesDelUsuario(): array
    {
        return [
            'sin sucursal' => [false],
            'con sucursal' => [true],
        ];
    }

    public static function permisosDeSucursal(): array
    {
        return [
            'solo ventas.crear' => [false],
            'con sucursales.todas' => [true],
        ];
    }
}
