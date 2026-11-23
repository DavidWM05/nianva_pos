<?php

namespace App\Aplicacion\Inicio;

use App\Aplicacion\Ventas\PresentarRankingVariantes;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Metricas\Services\ActividadOperativa;
use App\Modules\Metricas\Services\CrearContextoMetricas;
use App\Modules\Metricas\Services\ExistenciasMetricas;
use App\Modules\Metricas\Services\VentasComerciales;
use App\Modules\Nucleo\Dtos\ConsultarInicioDto;
use App\Modules\Nucleo\Support\DecimalApi;
use DateTimeImmutable;
use Illuminate\Support\Collection;

/**
 * Caso de uso de resumen de inicio que cruza Nucleo con Tpv y Apartados
 * (ARQ-03). Solo lectura: no abre transaccion.
 */
class ObtenerResumenInicio
{
    public function __construct(
        private readonly CrearContextoMetricas $contextos,
        private readonly VentasComerciales $ventas,
        private readonly PresentarRankingVariantes $ranking,
        private readonly ActividadOperativa $actividad,
        private readonly ExistenciasMetricas $existencias,
    ) {}

    /**
     * cliente_nombre sin `?->`: con el operador nullsafe Scramble lo documentaba como string, y
     * un apartado sin cliente lo deja en null. fecha_vencimiento nunca es null aqui (la consulta
     * filtra whereNotNull); el `?? throw` se lo dice al contrato (ARQ-12b).
     *
     * @return array{fecha_corte: string, zona_horaria: string, sucursal_id: ?int, ventas_hoy: array{cantidad: int, total: string}, gastos_hoy: string, ventas_netas_comerciales_mes: string, productos_activos: int, alertas_stock_bajo: int, ventas_ultimos_siete_dias: list<array{fecha: string, vendido: string, ventas_netas_comerciales: string}>, ranking_variantes: list<array{unidad: array{id: int, nombre: ?string}, variantes: list<array{variante_id: int, producto_nombre: ?string, cantidad_base: string}>}>, apartados_por_vencer: Collection<int, array{id: string, folio: ?string, cliente_nombre: ?string, fecha_vencimiento: string, total: string, total_abonado: string}>}
     */
    public function ejecutar(ConsultarInicioDto $consulta): array
    {
        $mes = $this->contextos->paraReporte($consulta->sucursalId);
        $dia = $mes->enPeriodo($mes->fechaCorte, $mes->fechaCorte);
        $ventasHoy = $this->ventas->totales($dia);
        $fechaInicioSerie = (new DateTimeImmutable($mes->fechaCorte, $mes->zona))->modify('-6 days')->format('Y-m-d');
        $serie = $mes->enPeriodo($fechaInicioSerie, $mes->fechaCorte);
        $apartadosPorVencer = $this->actividad->apartadosPorVencer($dia);

        return [
            'fecha_corte' => $mes->fechaCorte,
            'zona_horaria' => $mes->zona->getName(),
            'sucursal_id' => $mes->sucursalId,
            'ventas_hoy' => ['cantidad' => $ventasHoy->tickets, 'total' => $ventasHoy->vendido->aCadena()],
            'gastos_hoy' => $this->actividad->gastos($dia),
            'ventas_netas_comerciales_mes' => $this->ventas->totales($mes)->neto()->aCadena(),
            'productos_activos' => $this->existencias->productosActivos($dia),
            'alertas_stock_bajo' => $this->existencias->alertasStockBajo($dia),
            'ventas_ultimos_siete_dias' => $this->ventas->porDia($serie),
            'ranking_variantes' => $this->ranking->ejecutar($mes),
            'apartados_por_vencer' => $apartadosPorVencer->map(fn (Apartado $apartado) => [
                'id' => (string) $apartado->getAttribute('ulid'),
                'folio' => $apartado->getAttribute('folio') === null ? null : (string) $apartado->getAttribute('folio'),
                'cliente_nombre' => $apartado->cliente === null ? null : (string) $apartado->cliente->getAttribute('nombre'),
                'fecha_vencimiento' => substr((string) ($apartado->getRawOriginal('fecha_vencimiento') ?? throw new \LogicException('Apartado por vencer sin fecha de vencimiento.')), 0, 10),
                'total' => DecimalApi::dinero($apartado->getAttribute('total')),
                'total_abonado' => DecimalApi::dinero($apartado->getAttribute('total_abonado')),
            ]),
        ];
    }
}
