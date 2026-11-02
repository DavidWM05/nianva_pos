<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\GuardarRolRequest;
use App\Modules\Nucleo\Http\Resources\RolResource;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\GuardasDeRecurso;
use App\Modules\Nucleo\Support\Listado;
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
        $listado = Listado::aplicar(
            $request,
            Rol::query()->withCount('usuarios'),
            [
                'campos_ordenables' => self::CAMPOS_ORDENABLES,
                'orden_por_defecto' => 'nombre',
                'filtros' => ['nombre' => 'like'],
                'busqueda' => ['nombre'],
            ],
            $this->permisosDe($request),
        );

        return RolResource::collection($listado['items'])->additional(['meta' => $listado['meta']]);
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
