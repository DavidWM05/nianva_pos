<?php

namespace App\Modules\Devoluciones\Http\Controllers;

use App\Aplicacion\Devoluciones\RegistrarDevolucion;
use App\Http\Controllers\Controller;
use App\Modules\Devoluciones\Http\Requests\CrearDevolucionRequest;
use App\Modules\Devoluciones\Http\Resources\DevolucionResource;
use App\Modules\Devoluciones\Models\Devolucion;
use Illuminate\Http\Request;

/**
 * Como VentaController/ApartadoController: nunca calcula un precio ni
 * atrapa las excepciones de negocio (DevolucionSobreVentaSombraException,
 * DevolucionPagoNoCuadraException, y las que hereda de Tpv al crear la
 * venta sombra de un cambio, ej. CajaSesionNoAbiertaException) -- todo
 * eso vive en DevolucionService y se mapea a JSON 422 en bootstrap/app.php.
 *
 * Orquestacion: App\Aplicacion\Devoluciones\RegistrarDevolucion
 * (incluye la creacion de la Nota de Credito cuando aplica).
 */
class DevolucionController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha', 'diferencia'];

    public function index(Request $request)
    {
        $query = Devolucion::query()->with(['venta:id,cliente_id', 'venta.cliente:id,nombre']);

        if ($ventaId = $request->query('filtro_venta_id')) {
            $query->where('venta_id', (int) $ventaId);
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('fecha');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        $usuario = $request->user();

        return response()->json([
            'data' => DevolucionResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('devoluciones.crear'),
                ],
            ],
        ]);
    }

    public function show(Devolucion $devolucion)
    {
        return new DevolucionResource(
            $devolucion->load(['venta.cliente', 'ventaSombra', 'items.variante.producto', 'pagos.metodoPago']),
        );
    }

    /**
     * Orquestacion: App\Aplicacion\Devoluciones\RegistrarDevolucion.
     */
    public function store(CrearDevolucionRequest $request, RegistrarDevolucion $registrarDevolucion)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $resultado = $registrarDevolucion->ejecutar($request->toDto(), $usuario);

        $devolucion = $resultado['devolucion'];
        $nota = $resultado['nota_credito'];

        $devolucion->load(['venta.cliente', 'ventaSombra', 'items.variante.producto', 'pagos.metodoPago']);

        return response()->json([
            'data' => new DevolucionResource($devolucion),
            'nota_credito' => $nota ? ['id' => $nota->id, 'monto_original' => $nota->monto_original] : null,
        ], 201);
    }
}
