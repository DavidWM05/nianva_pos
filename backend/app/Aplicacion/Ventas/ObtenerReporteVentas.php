<?php

declare(strict_types=1);

namespace App\Aplicacion\Ventas;

use App\Modules\Metricas\Services\CrearContextoMetricas;
use App\Modules\Metricas\Services\RentabilidadComercial;
use App\Modules\Metricas\Services\VentasComerciales;
use App\Modules\Nucleo\Dtos\ConsultaMetricasSucursalDto;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

final readonly class ObtenerReporteVentas
{
    public function __construct(
        private CrearContextoMetricas $contextos,
        private VentasComerciales $ventas,
        private PresentarRankingVariantes $ranking,
        private RentabilidadComercial $rentabilidad,
    ) {}

    /** @return array{data: array<string, mixed>, meta: array{page: int, rows: int, total: int, filtros_aplicados: array{sucursal_id: ?int}, permisos: array{exportar: bool}}} */
    public function ejecutar(ConsultaMetricasSucursalDto $consulta, bool $puedeVerCostos = false): array
    {
        try {
            $contexto = $this->contextos->paraReporte($consulta->sucursalId, $consulta->desde, $consulta->hasta);
        } catch (InvalidArgumentException $error) {
            throw ValidationException::withMessages(['fecha_hasta' => $error->getMessage()]);
        }
        $totales = $this->ventas->totales($contexto);

        $detalle = $this->ventas->detalle($contexto, $consulta->pagina, $consulta->filas);

        $data = [
            'total_ventas' => DecimalApi::dinero($totales->vendido->aCadena()),
            'numero_ventas' => $totales->tickets,
            'ticket_promedio' => DecimalApi::dinero($totales->promedio()->aCadena()),
            ...$this->ventas->desgloses($contexto),
            'periodo' => [
                'desde' => $contexto->periodo->desde,
                'hasta' => $contexto->periodo->hasta,
                'zona_horaria' => $contexto->zona->getName(),
            ],
            'sucursal_id' => $contexto->sucursalId,
            'totales' => $totales->aArray(),
            'por_dia' => $this->ventas->porDia($contexto),
            'ranking_variantes' => $this->ranking->ejecutar($contexto),
            /** @var list<array{tipo: 'venta'|'devolucion'|'cambio', folio: string|null, fecha: string, importe_comercial: string}> */
            'detalle' => $detalle['filas'],
        ];

        if ($puedeVerCostos) {
            $data['rentabilidad'] = $this->rentabilidad->totales($contexto, $totales->neto());
        }

        return [
            'data' => $data,
            'meta' => [
                'page' => $consulta->pagina,
                'rows' => $consulta->filas,
                'total' => $detalle['total'],
                'filtros_aplicados' => ['sucursal_id' => $contexto->sucursalId],
                'permisos' => ['exportar' => false],
            ],
        ];
    }
}
