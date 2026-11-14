<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Nucleo\ActualizarUsuario;
use App\Aplicacion\Nucleo\DesactivarUsuario;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\GuardarUsuarioRequest;
use App\Modules\Nucleo\Http\Resources\UsuarioAdminResource;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\Listado;
use Illuminate\Http\Request;

/**
 * Fase C: primer CRUD de administracion (Usuarios/Roles). Mismo esquema
 * que ClienteController -- ver el reporte. `correo` es unico GLOBALMENTE
 * (no por tenant, ver la migracion de usuarios), asi que la regla de
 * unicidad no lleva ->where('tenant_id', ...) como si llevan otros
 * catalogos multi-tenant.
 */
class UsuarioController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre', 'correo'];

    public function index(Request $request)
    {
        $listado = Listado::aplicar(
            $request,
            Usuario::query()->with(['sucursal:id,nombre', 'roles:id,nombre']),
            [
                'campos_ordenables' => self::CAMPOS_ORDENABLES,
                'orden_por_defecto' => 'nombre',
                'filtros' => ['nombre' => 'like'],
                'busqueda' => ['nombre', 'apellido', 'alias', 'correo'],
            ],
            $this->permisosDe($request),
        );

        return UsuarioAdminResource::collection($listado['items'])->additional(['meta' => $listado['meta']]);
    }

    public function show(Request $request, Usuario $usuario)
    {
        $usuario->load(['sucursal:id,nombre', 'roles:id,nombre']);

        return response()->json([
            'data' => new UsuarioAdminResource($usuario),
            'meta' => ['permisos' => $this->permisosDe($request)],
        ]);
    }

    public function store(GuardarUsuarioRequest $request)
    {
        $dto = $request->toDto();
        $roles = $this->rolesVisiblesDelTenant($dto->rolesParaSync() ?? []);
        $datos = $dto->datosPresentes();

        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['activo'] = true;

        $usuario = Usuario::create($datos);
        $usuario->roles()->sync($roles);
        $usuario->load(['sucursal:id,nombre', 'roles:id,nombre']);

        return (new UsuarioAdminResource($usuario))->response()->setStatusCode(201);
    }

    /**
     * La contrasena opcional, el filtro de roles visibles y la guarda del
     * ultimo admin (DAT-10) viven en ActualizarUsuario.
     */
    public function update(GuardarUsuarioRequest $request, Usuario $usuario, ActualizarUsuario $action)
    {
        $usuario = $action->ejecutar($usuario, $request->toDto());
        $usuario->load(['sucursal:id,nombre', 'roles:id,nombre']);

        return new UsuarioAdminResource($usuario);
    }

    /**
     * Soft: nunca DELETE fisico (igual que el resto del catalogo) -- solo
     * apaga `activo`. Un usuario no puede desactivarse a si mismo, sin
     * importar el permiso -- se quedaria sin poder volver a entrar a
     * revertirlo. Esa guarda y la del ultimo admin (DAT-10) viven en
     * DesactivarUsuario.
     */
    public function desactivar(Request $request, Usuario $usuario, DesactivarUsuario $action)
    {
        $actor = $request->user();

        if ($actor === null) {
            abort(401);
        }

        $usuario = $action->ejecutar($usuario, $actor);
        $usuario->load(['sucursal:id,nombre', 'roles:id,nombre']);

        return new UsuarioAdminResource($usuario);
    }

    /**
     * Desactiva el 2FA de OTRO usuario -- reemplaza el autoservicio que
     * tenia TwoFactorController::disable() (eliminado). La ruta ya exige
     * dos-factor.reciente, que valida el TOTP de quien ejecuta la accion
     * (el admin autenticado), no el del usuario objetivo -- ver
     * RequiereDosFactorReciente. El guard de rol de abajo si mira al
     * objetivo: si su rol exige 2FA (Usuario::requiereDosFactor()), sigue
     * sin poderse apagar, ahora tampoco por un admin.
     */
    public function desactivarDosFactor(Request $request, Usuario $usuario)
    {
        if ($usuario->requiereDosFactor()) {
            abort(403, 'La autenticacion en dos pasos es obligatoria para el rol de este usuario.');
        }

        if ($usuario->two_factor_confirmed_at === null) {
            abort(409, 'Este usuario no tiene la autenticacion en dos pasos activada.');
        }

        $usuario->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        $usuario->load(['sucursal:id,nombre', 'roles:id,nombre']);

        return new UsuarioAdminResource($usuario);
    }

    /**
     * `roles.*` usa ReglasTenant::existeGlobalODelTenant(), que ya rechaza
     * roles de otro tenant. Este segundo filtro, pasando los ids por una
     * consulta Eloquent normal (con el scope activo), descarta cualquier id
     * que no pertenezca al tenant actual o al catalogo global (es_sistema).
     *
     * @param  list<int>  $rolesIds
     * @return list<int>
     */
    private function rolesVisiblesDelTenant(array $rolesIds): array
    {
        if ($rolesIds === []) {
            return [];
        }

        return Rol::whereIn('id', $rolesIds)->pluck('id')->all();
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request): array
    {
        $usuario = $request->user();

        return [
            'crear' => $usuario->tienePermiso('usuarios.crear'),
            'editar' => $usuario->tienePermiso('usuarios.editar'),
            'eliminar' => $usuario->tienePermiso('usuarios.eliminar'),
        ];
    }
}
