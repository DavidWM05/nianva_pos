<?php

declare(strict_types=1);

namespace App\Modules\Apartados\Http\Controllers;

use App\Aplicacion\Apartados\CancelarApartado;
use App\Aplicacion\Apartados\CrearApartado;
use App\Aplicacion\Apartados\LiquidarApartado;
use App\Aplicacion\Apartados\RegistrarAbonoApartado;
use App\Http\Controllers\Controller;
use App\Modules\Apartados\Dtos\LiquidarApartadoDto;
use App\Modules\Apartados\Http\Requests\CancelarApartadoRequest;
use App\Modules\Apartados\Http\Requests\CrearApartadoRequest;
use App\Modules\Apartados\Http\Requests\RegistrarAbonoRequest;
use App\Modules\Apartados\Http\Resources\ApartadoResource;
use App\Modules\Apartados\Models\Apartado;
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

    public function store(CrearApartadoRequest $request, CrearApartado $crearApartado)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $apartado = $crearApartado->ejecutar($request->toDto(), $usuario);

        $apartado->load(['cliente', 'detalles.variante.producto']);

        return (new ApartadoResource($apartado))->response()->setStatusCode(201);
    }

    public function registrarAbono(RegistrarAbonoRequest $request, Apartado $apartado, RegistrarAbonoApartado $registrarAbonoApartado)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $registrarAbonoApartado->ejecutar($request->toDto(), $apartado, $usuario);

        return new ApartadoResource($apartado->fresh(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago']));
    }

    public function liquidar(Request $request, Apartado $apartado, LiquidarApartado $liquidarApartado)
    {
        // No hay payload que validar: se conserva el Request y el contrato de esta ruta.
        $liquidarApartado->ejecutar(new LiquidarApartadoDto, $apartado, $request->user());

        return new ApartadoResource($apartado->fresh(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago']));
    }

    public function cancelar(CancelarApartadoRequest $request, Apartado $apartado, CancelarApartado $cancelarApartado)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $resultado = $cancelarApartado->ejecutar($request->toDto(), $apartado, $usuario);

        return response()->json([
            'data' => new ApartadoResource($resultado->apartado->load(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago'])),
            'meta' => [
                'tiene_abonos_pendientes' => $resultado->tieneAbonosPendientes,
                'monto_abonado_pendiente' => $resultado->montoAbonadoPendiente,
            ],
        ]);
    }
}
