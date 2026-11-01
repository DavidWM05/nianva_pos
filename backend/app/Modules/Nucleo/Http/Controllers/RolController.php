<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\GuardarRolRequest;
use App\Modules\Nucleo\Http\Resources\RolResource;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\GuardasDeRecurso;
use Illuminate\Http\Request;

/**
 * Fase C. A diferencia del resto del catalogo (desactivar/activo), Rol no
 * tiene columna `activo` -- destroy() es un DELETE fisico real, guardado
 * por GuardasDeRecurso::rolSistema() (admin/vendedor, tenant_id NULL, sembrados
 * por NucleoRolesPermisosSeeder) y por "no eliminar un rol con usuarios
 * asignados" (evita dejar usuarios sin rol de golpe).
 */
class RolController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre'];

    public function index(Request $request)
    {
        $query = Rol::query()->withCount('usuarios');

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
            'data' => RolResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request),
            ],
        ]);
    }

    public function show(Request $request, Rol $rol)
    {
        $rol->load('permisos:id');

        return response()->json([
            'data' => new RolResource($rol),
            'meta' => ['permisos' => $this->permisosDe($request)],
        ]);
    }

    public function store(GuardarRolRequest $request)
    {
        $dto = $request->toDto();
        $permisos = $this->permisosValidos($dto->permisosParaSync() ?? []);
        $datos = $dto->datosPresentes();

        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['es_sistema'] = false;

        $rol = Rol::create($datos);
        $rol->permisos()->sync($permisos);
        $rol->load('permisos:id');

        return (new RolResource($rol))->response()->setStatusCode(201);
    }

    public function update(GuardarRolRequest $request, Rol $rol)
    {
        $dto = $request->toDto();
        $permisos = $dto->permisosParaSync();

        $rol->update($dto->datosPresentes());
        if ($permisos !== null) {
            $rol->permisos()->sync($this->permisosValidos($permisos));
        }
        $rol->load('permisos:id');

        return new RolResource($rol);
    }

    public function destroy(Request $request, Rol $rol)
    {
        GuardasDeRecurso::rolSistema($rol, $request->user());

        if ($rol->usuarios()->exists()) {
            abort(422, 'No puedes eliminar un rol con usuarios asignados. Quita el rol de esos usuarios primero.');
        }

        $rol->delete();

        return response()->json(['data' => null]);
    }

    /**
     * @param  list<int>  $permisosIds
     * @return list<int>
     */
    private function permisosValidos(array $permisosIds): array
    {
        if ($permisosIds === []) {
            return [];
        }

        return Permiso::whereIn('id', $permisosIds)->pluck('id')->all();
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request): array
    {
        $usuario = $request->user();

        return [
            'crear' => $usuario->tienePermiso('roles.crear'),
            'editar' => $usuario->tienePermiso('roles.editar'),
            'eliminar' => $usuario->tienePermiso('roles.eliminar'),
        ];
    }
}
