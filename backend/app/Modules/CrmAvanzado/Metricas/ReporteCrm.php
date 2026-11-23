<?php

declare(strict_types=1);

namespace App\Modules\CrmAvanzado\Metricas;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CrmAvanzado\Services\CrmAvanzadoService;
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;
use App\Modules\Nucleo\Scopes\SucursalScope;
use App\Modules\Tpv\Models\Venta;

final readonly class ReporteCrm
{
    public function __construct(private CrmAvanzadoService $crmAvanzadoService) {}

    /** @return array{data: array<string, mixed>, meta: array{page: int, rows: int, total: int, filtros_aplicados: object, permisos: array{exportar: bool}}} */
    public function consultar(int $tenantId, ConsultarReporteTenantDto $filtros): array
    {
        // 1. Segmentos — calcular al vuelo
        $actividad = Venta::query()->withoutGlobalScope(SucursalScope::class)->where('tenant_id', $tenantId)
            ->whereNotNull('cliente_id')
            ->selectRaw("cliente_id, count(*) as ventas, max(case when estado = 'completada' then fecha end) as ultima_completada")
            ->groupBy('cliente_id')->get()->keyBy('cliente_id');
        $segmentos = ['nuevo' => 0, 'frecuente' => 0, 'vip' => 0, 'inactivo' => 0];
        $limite = now()->subMonth()->toDateTimeString();
        foreach (Cliente::query()->where('tenant_id', $tenantId)->select('id')->cursor() as $cliente) {
            $fila = $actividad->get($cliente->id);
            $ultima = $fila?->getAttribute('ultima_completada');
            $segmento = $this->crmAvanzadoService->segmentoPorActividad((int) ($fila?->getAttribute('ventas') ?? 0), $ultima === null ? null : (string) $ultima, $limite);
            $segmentos[$segmento]++;
        }

        // 2. Interacciones — agrupadas por tipo
        $interacciones = CrmInteraccion::where('tenant_id', $tenantId)
            ->selectRaw('tipo, count(*) as total')
            ->groupBy('tipo')
            ->pluck('total', 'tipo');

        // 3. Loyalty
        $puntosGanados = (int) LoyaltyTransaccion::where('tenant_id', $tenantId)
            ->where('tipo', 'ganados')->sum('puntos');
        $puntosCanjeados = abs((int) LoyaltyTransaccion::where('tenant_id', $tenantId)
            ->where('tipo', 'canjeados')->sum('puntos'));
        $puntosVencidos = abs((int) LoyaltyTransaccion::where('tenant_id', $tenantId)
            ->where('tipo', 'vencidos')->sum('puntos'));
        $saldoActual = (int) Cliente::where('tenant_id', $tenantId)->sum('puntos_loyalty');

        // 4. Campañas recientes
        $campanas = CrmCampana::where('tenant_id', $tenantId)
            ->whereNotNull('enviado_en')
            ->orderByDesc('enviado_en')
            ->limit(10)
            ->get(['id', 'asunto', 'segmento', 'destinatarios', 'enviado_en']);

        $pagina = CrmCampana::query()->where('tenant_id', $tenantId)->whereNotNull('enviado_en')
            ->orderByDesc('enviado_en')->orderByDesc('id')
            ->paginate($filtros->filas, ['id', 'asunto', 'segmento', 'destinatarios', 'enviado_en'], 'page', $filtros->pagina);

        return ['data' => [
            /** @var array{nuevo: int, frecuente: int, vip: int, inactivo: int} */
            'clientes_por_segmento' => $segmentos,
            // Solo los tipos con al menos una interaccion (pluck('total', 'tipo')).
            /** @var array<'llamada'|'email'|'whatsapp'|'nota'|'visita', int> */
            'interacciones_por_tipo' => $interacciones,
            'loyalty' => [
                'puntos_ganados_total' => $puntosGanados,
                'puntos_canjeados_total' => $puntosCanjeados,
                'puntos_vencidos_total' => $puntosVencidos,
                'saldo_actual_total' => $saldoActual,
            ],
            /** @var list<array{id: int, asunto: string, segmento: 'todos'|'nuevo'|'frecuente'|'vip'|'inactivo'|null, destinatarios: int, enviado_en: string}> */
            'campanas_recientes' => $campanas,
            /** @var list<array{id: int, asunto: string, segmento: 'todos'|'nuevo'|'frecuente'|'vip'|'inactivo'|null, destinatarios: int, enviado_en: string}> */
            'detalle' => $pagina->items(),
        ], 'meta' => [
            'page' => $filtros->pagina,
            'rows' => $filtros->filas,
            'total' => $pagina->total(),
            /** @var array<string, string> */
            'filtros_aplicados' => (object) [],
            'permisos' => ['exportar' => false],
        ]];
    }
}
