<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\GuardarUsuarioRequest;
use App\Modules\Nucleo\Http\Resources\UsuarioAdminResource;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
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
        $query = Usuario::query()->with(['sucursal:id,nombre', 'roles:id,nombre']);

        if ($nombre = $request->query('filtro_nombre')) {
            $query->where('nombre', 'like', "%{$nombre}%");
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderBy('nombre');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => UsuarioAdminResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request),
            ],
        ]);
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

    public function update(GuardarUsuarioRequest $request, Usuario $usuario)
    {
        $dto = $request->toDto();
        $roles = $dto->rolesParaSync();
        $datos = $dto->datosPresentes();

        // Contrasena opcional en edicion -- omitirla del array deja el
        // valor actual intacto (nunca se sobreescribe con null/vacio).
        if (empty($datos['password'])) {
            unset($datos['password']);
        }

        $usuario->update($datos);
        if ($roles !== null) {
            $usuario->roles()->sync($this->rolesVisiblesDelTenant($roles));
        }
        $usuario->load(['sucursal:id,nombre', 'roles:id,nombre']);

        return new UsuarioAdminResource($usuario);
    }

    /**
     * Soft: nunca DELETE fisico (igual que el resto del catalogo) -- solo
     * apaga `activo`. Un usuario no puede desactivarse a si mismo, sin
     * importar el permiso -- se quedaria sin poder volver a entrar a
     * revertirlo.
     */
    public function desactivar(Request $request, Usuario $usuario)
    {
        if ($usuario->is($request->user())) {
            abort(403, 'No puedes desactivar tu propio usuario.');
        }

        $usuario->update(['activo' => false]);
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
