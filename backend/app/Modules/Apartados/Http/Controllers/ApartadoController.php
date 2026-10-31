<?php

namespace App\Modules\Apartados\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Http\Requests\CancelarApartadoRequest;
use App\Modules\Apartados\Http\Requests\CrearApartadoRequest;
use App\Modules\Apartados\Http\Requests\RegistrarAbonoRequest;
use App\Modules\Apartados\Http\Resources\ApartadoResource;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use Illuminate\Http\Request;

/**
 * Como VentaController, nunca calcula un precio ni atrapa las excepciones
 * de negocio (ApartadoSaldoInsuficienteException, AbonoPagoNoCuadraException,
 * ApartadoEstadoInvalidoException, y las que ApartadoService hereda de Tpv/
 * Inventario al liquidar) -- todo eso vive en ApartadoService y se mapea a
 * JSON 422 en bootstrap/app.php.
 */
class ApartadoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha_creacion', 'fecha_vencimiento', 'total'];

    public function index(Request $request)
    {
        $query = Apartado::query()->with('cliente:id,nombre');

        if ($clienteNombre = $request->query('filtro_cliente')) {
            $query->whereHas('cliente', fn ($q) => $q->where('nombre', 'like', "%{$clienteNombre}%"));
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('fecha_creacion');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        $usuario = $request->user();

        return response()->json([
            'data' => ApartadoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('apartados.crear'),
                ],
            ],
        ]);
    }

    public function show(Request $request, Apartado $apartado)
    {
        $usuario = $request->user();

        return response()->json([
            'data' => new ApartadoResource($apartado->load(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago'])),
            'meta' => [
                'permisos' => [
                    'abonar' => $usuario->tienePermiso('apartados.abonar'),
                    'cancelar' => $usuario->tienePermiso('apartados.cancelar'),
                ],
            ],
        ]);
    }

    public function store(CrearApartadoRequest $request, ApartadoService $apartadoService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();
        $items = array_map(
            fn (LineaApartadoDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
            ],
            $dto->items,
        );

        $apartado = $apartadoService->crearApartado(
            [
                'tenant_id' => (int) $usuario->getAttribute('tenant_id'),
                'sucursal_id' => (int) $usuario->getAttribute('sucursal_id'),
                'cliente_id' => $dto->clienteId,
                'usuario_id' => $usuario->id,
                'fecha_vencimiento' => $dto->fechaVencimiento,
                'notas' => $dto->notas,
            ],
            $items,
        );

        $apartado->load(['cliente', 'detalles.variante.producto']);

        return (new ApartadoResource($apartado))->response()->setStatusCode(201);
    }

    public function registrarAbono(RegistrarAbonoRequest $request, Apartado $apartado, ApartadoService $apartadoService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();
        $pagos = array_map(
            fn (PagoApartadoDto $pago) => [
                'metodo_pago_id' => $pago->metodoPagoId,
                'monto' => $pago->monto,
            ],
            $dto->pagos,
        );

        $apartadoService->registrarAbono(
            $apartado,
            $dto->monto,
            $usuario->id,
            $pagos,
            $dto->notas,
        );

        return new ApartadoResource($apartado->fresh(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago']));
    }

    public function liquidar(Request $request, Apartado $apartado, ApartadoService $apartadoService)
    {
        $apartadoService->liquidar($apartado, $request->user()->id);

        return new ApartadoResource($apartado->fresh(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago']));
    }

    public function cancelar(CancelarApartadoRequest $request, Apartado $apartado, ApartadoService $apartadoService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $resultado = $apartadoService->cancelar($apartado, $request->toDto()->motivo, $usuario);

        return response()->json([
            'data' => new ApartadoResource($resultado->apartado->load(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago'])),
            'meta' => [
                'tiene_abonos_pendientes' => $resultado->tieneAbonosPendientes,
                'monto_abonado_pendiente' => $resultado->montoAbonadoPendiente,
            ],
        ]);
    }
}
