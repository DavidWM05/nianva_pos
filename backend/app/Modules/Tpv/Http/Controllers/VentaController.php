<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Reportes\ExportarReporteCsv;
use App\Aplicacion\Ventas\AnularVenta;
use App\Aplicacion\Ventas\ObtenerReporteVentas;
use App\Aplicacion\Ventas\RegistrarVenta;
use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Dtos\ConsultaMetricasSucursalDto;
use App\Modules\Nucleo\Http\Requests\ConsultarMetricasSucursalRequest;
use App\Modules\Nucleo\Http\Support\OperacionSupervisorHttp;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Http\Requests\AnularVentaRequest;
use App\Modules\Tpv\Http\Requests\CotizarVentaRequest;
use App\Modules\Tpv\Http\Requests\CrearVentaRequest;
use App\Modules\Tpv\Http\Resources\CotizacionVentaLineaResource;
use App\Modules\Tpv\Http\Resources\VentaResource;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Carbon\CarbonImmutable;
use Dedoc\Scramble\Attributes\HeaderParameter;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Vive en Tpv (no en Crm) a proposito: Tpv ya depende de Crm (Venta
 * pertenece a Cliente), invertir esa dependencia haria que ambos modulos
 * se importaran entre si. La ruta HTTP igual queda anidada bajo
 * /api/clientes/{cliente}/ventas (ver routes/api.php) -- el URL no tiene
 * que reflejar en que modulo vive el controlador.
 *
 * store() delega la orquestacion entre modulos en
 * App\Aplicacion\Ventas\RegistrarVenta. anular() usa AnularVenta y cotizar()
 * sigue llamando a VentaService; los errores de negocio se mapean a JSON 422 en
 * bootstrap/app.php.
 */
class VentaController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha', 'total'];

    public function porCliente(Cliente $cliente)
    {
        $ventas = Venta::where('cliente_id', $cliente->id)
            ->orderByDesc('fecha')
            ->limit(50)
            ->get(['id', 'ulid', 'folio', 'fecha', 'total', 'estado', 'es_venta_sombra']);

        // Las mismas columnas del get(), mapeadas una por una: así el contrato publica esas cinco
        // y no la venta completa.
        $filas = [];
        foreach ($ventas as $venta) {
            $filas[] = [
                'id' => (string) $venta->getAttribute('ulid'),
                'folio' => $venta->getAttribute('folio'),
                'fecha' => $venta->getAttribute('fecha'),
                'total' => DecimalApi::dinero($venta->getAttribute('total')),
                /** @var 'completada'|'anulada' */
                'estado' => $venta->getAttribute('estado'),
                'es_venta_sombra' => (bool) $venta->getAttribute('es_venta_sombra'),
            ];
        }

        return response()->json(['data' => $filas]);
    }

    public function index(Request $request)
    {
        $query = Venta::query()->with(['cliente:id,ulid,nombre', 'pagos.metodoPago:id,nombre']);

        if ($clienteNombre = $request->query('filtro_cliente')) {
            $query->whereHas('cliente', fn ($q) => $q->where('nombre', 'like', "%{$clienteNombre}%"));
        }

        $folio = $request->query('filtro_folio');
        if (is_string($folio) && $folio !== '') {
            $query->where('folio', $folio);
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
            'data' => VentaResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'anular' => $usuario->tienePermiso('ventas.anular'),
                ],
            ],
        ]);
    }

    public function show(Venta $venta)
    {
        return new VentaResource($venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto', 'detalles.variante.valoresAtributo.valor.atributo']));
    }

    /**
     * Orquestacion: App\Aplicacion\Ventas\RegistrarVenta.
     */
    #[HeaderParameter(OperacionSupervisorHttp::CABECERA, description: 'Token opaco de supervisor para la operación autorizada.', type: 'string')]
    public function store(CrearVentaRequest $request, RegistrarVenta $registrarVenta)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $venta = $registrarVenta->ejecutar($request->toDto(), $usuario, OperacionSupervisorHttp::de($request));

        $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto', 'detalles.variante.valoresAtributo.valor.atributo']);

        return (new VentaResource($venta))->response()->setStatusCode(201);
    }

    #[HeaderParameter(OperacionSupervisorHttp::CABECERA, description: 'Token opaco de supervisor para la operación autorizada.', type: 'string')]
    public function anular(AnularVentaRequest $request, Venta $venta, AnularVenta $anularVenta)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $venta = $anularVenta->ejecutar($request->toDto(), $venta, $usuario, OperacionSupervisorHttp::de($request));
        $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto', 'detalles.variante.valoresAtributo.valor.atributo']);

        return new VentaResource($venta);
    }

    public function cotizar(CotizarVentaRequest $request, VentaService $ventaService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();
        $items = array_map(
            fn (LineaVentaDto $item) => [
                'variante_id' => $item->varianteId,
                ...($item->presentacionId === null ? [] : ['presentacion_id' => $item->presentacionId]),
                'cantidad' => $item->cantidad,
            ],
            $dto->items,
        );

        $tenantId = app(TenantContext::class)->id();

        if ($tenantId === null) {
            abort(500);
        }

        [$lineas, $subtotal] = $ventaService->cotizarItems($tenantId, $items, new ContextoPrecio($tenantId, $usuario->getAttribute('sucursal_id') === null ? null : (int) $usuario->getAttribute('sucursal_id'), $dto->clienteId, CarbonImmutable::now(), $dto->listaPrecioId));

        $itemsCotizados = [];
        foreach ($lineas as $linea) {
            $itemsCotizados[] = new CotizacionVentaLineaResource($linea);
        }

        return response()->json(['data' => ['items' => $itemsCotizados, 'subtotal' => DecimalApi::dinero($subtotal)]]);
    }

    public function reporte(ConsultarMetricasSucursalRequest $request, ObtenerReporteVentas $obtenerReporteVentas): JsonResponse
    {
        $usuario = $request->user();
        $resultado = $obtenerReporteVentas->ejecutar($request->toDto(), $usuario instanceof Usuario && $usuario->tienePermiso('reportes.costos'));
        $resultado['meta']['permisos']['exportar'] = $usuario instanceof Usuario && $usuario->tienePermiso('reportes.exportar');

        return response()->json($resultado);
    }

    #[Response(description: 'Archivo CSV del reporte', mediaType: 'text/csv; charset=UTF-8', format: 'binary')]
    #[Response(status: 403, description: 'Falta el permiso de lectura o reportes.exportar', type: 'array{message: string, error_code: string}')]
    #[Response(status: 422, description: 'Filtros inválidos o más de 10 000 filas', type: "array{message: string, error_code: 'reporte_exportacion_limite', limite: int}|array{message: string, errors: array<string, list<string>>}")]
    public function exportar(ConsultarMetricasSucursalRequest $request, ObtenerReporteVentas $reporte, ExportarReporteCsv $exportar): BinaryFileResponse
    {
        $consulta = $request->toDto();
        $usuario = $request->user();
        $resultado = $reporte->ejecutar(
            new ConsultaMetricasSucursalDto($consulta->sucursalId, $consulta->desde, $consulta->hasta, 1, ExportarReporteCsv::LIMITE),
            $usuario instanceof Usuario && $usuario->tienePermiso('reportes.costos'),
        );

        return $exportar->ejecutar('ventas', $resultado, ['tipo', 'folio', 'fecha', 'importe_comercial'], ['importe_comercial'], ['totales', 'rentabilidad']);
    }
}
