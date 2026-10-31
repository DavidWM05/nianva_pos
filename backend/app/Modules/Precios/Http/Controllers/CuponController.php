<?php

namespace App\Modules\Precios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Http\Requests\GuardarCuponRequest;
use App\Modules\Precios\Http\Requests\ValidarCuponRequest;
use App\Modules\Precios\Http\Resources\CuponResource;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PrecioService;
use Illuminate\Http\Request;

/**
 * Sin campos condicionales (ver ReglaPrecioController) -- formulario
 * simple, mismo esquema de siempre.
 */
class CuponController extends Controller
{
    private const CAMPOS_ORDENABLES = ['codigo', 'nombre', 'fecha_inicio', 'fecha_fin'];

    public function index(Request $request)
    {
        $query = Cupon::query();

        if ($busqueda = $request->query('filtro_nombre')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('nombre', 'like', "%{$busqueda}%")->orWhere('codigo', 'like', "%{$busqueda}%");
            });
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

        $usuario = $request->user();

        return response()->json([
            'data' => CuponResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('cupones.crear'),
                    'editar' => $usuario->tienePermiso('cupones.editar'),
                    'eliminar' => $usuario->tienePermiso('cupones.eliminar'),
                ],
            ],
        ]);
    }

    public function show(Request $request, Cupon $cupon)
    {
        $usuario = $request->user();

        return response()->json([
            'data' => new CuponResource($cupon),
            'meta' => [
                'permisos' => [
                    'editar' => $usuario->tienePermiso('cupones.editar'),
                    'eliminar' => $usuario->tienePermiso('cupones.eliminar'),
                ],
            ],
        ]);
    }

    public function store(GuardarCuponRequest $request)
    {
        $datos = $request->toDto()->datosPresentes();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['activo'] = true;

        $cupon = Cupon::create($datos);

        return (new CuponResource($cupon))->response()->setStatusCode(201);
    }

    public function update(GuardarCuponRequest $request, Cupon $cupon)
    {
        $cupon->update($request->toDto()->datosPresentes());

        return new CuponResource($cupon);
    }

    public function desactivar(Cupon $cupon)
    {
        $cupon->update(['activo' => false]);

        return new CuponResource($cupon);
    }

    /**
     * Usado desde la pantalla de venta (TPV), no desde este modulo -- por
     * eso el permiso es `ventas.crear`, no `cupones.ver`: un vendedor
     * puede aplicar un cupon existente sin poder administrar el catalogo
     * de cupones. Nunca calcula el descuento en el frontend -- misma
     * autoridad de precios que VentaService (PrecioService::aplicarCupon()),
     * que ya valida vigencia y lanza CuponInvalidoException (mapeada a
     * 422 en bootstrap/app.php) si el codigo no existe/esta inactivo/fuera
     * de rango.
     */
    public function validar(ValidarCuponRequest $request, PrecioService $precioService)
    {
        $dto = $request->toDto();
        $resultado = $precioService->aplicarCupon($dto->codigo, $dto->total);

        return response()->json([
            'data' => [
                'cupon' => [
                    'id' => $resultado->cupon->id,
                    'codigo' => $resultado->cupon->codigo,
                    'nombre' => $resultado->cupon->nombre,
                    'tipo' => $resultado->cupon->tipo,
                    'valor' => $resultado->cupon->valor,
                ],
                'descuento' => $resultado->descuento,
                'total_con_descuento' => $resultado->totalConDescuento(),
            ],
        ]);
    }
}
