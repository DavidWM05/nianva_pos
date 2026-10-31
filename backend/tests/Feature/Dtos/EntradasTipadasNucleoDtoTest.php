<?php

namespace Tests\Feature\Dtos;

use App\Modules\Nucleo\Dtos\LoginDto;
use App\Modules\Nucleo\Dtos\RolDto;
use App\Modules\Nucleo\Http\Requests\GuardarRolRequest;
use App\Modules\Nucleo\Http\Requests\LoginRequest;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Models\Permiso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use SensitiveParameter;
use Tests\TestCase;

class EntradasTipadasNucleoDtoTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_dto_tipa_credenciales_y_password_es_sensible(): void
    {
        $request = $this->validar(LoginRequest::class, [
            'correo' => 'ana@test.com',
            'password' => 'password-valida-123',
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(LoginDto::class, $dto);
        $this->assertSame('ana@test.com', $dto->correo);
        $this->assertSame('password-valida-123', $dto->password);

        $parametro = collect((new ReflectionMethod(LoginDto::class, '__construct'))->getParameters())
            ->firstOrFail(fn (\ReflectionParameter $parametro) => $parametro->getName() === 'password');

        $this->assertNotEmpty($parametro->getAttributes(SensitiveParameter::class));
    }

    public function test_rol_dto_tipa_la_lista_de_permisos(): void
    {
        $permisoA = Permiso::create(['nombre' => 'clientes.ver', 'modulo' => 'clientes', 'accion' => 'ver']);
        $permisoB = Permiso::create(['nombre' => 'ventas.ver', 'modulo' => 'ventas', 'accion' => 'ver']);

        $request = $this->validar(GuardarRolRequest::class, [
            'nombre' => 'Cajero',
            'descripcion' => 'Solo caja',
            'permisos' => [$permisoA->id, $permisoB->id],
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(RolDto::class, $dto);
        $this->assertSame('Cajero', $dto->nombre);
        $this->assertSame([$permisoA->id, $permisoB->id], $dto->permisos);
        $this->assertSame([$permisoA->id, $permisoB->id], $dto->permisosParaSync());
    }

    /**
     * @param  class-string<SolicitudNegocio>  $clase
     * @param  array<string, mixed>  $payload
     */
    private function validar(string $clase, array $payload): SolicitudNegocio
    {
        $request = $clase::create('/api/test', 'POST', $payload);
        $request->setContainer(app());
        $request->setRedirector(app('redirect'));
        $request->validateResolved();

        return $request;
    }
}
