<?php

declare(strict_types=1);

namespace App\Modules\CuentasCobrar\Metricas;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\CortesAntiguedad;
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;
use App\Modules\Nucleo\Scopes\SucursalScope;
use App\Modules\Nucleo\Support\DecimalApi;

final class ReporteCuentasCobrar
{
    /** @return array{data: array<string, mixed>, meta: array{page: int, rows: int, total: int, filtros_aplicados: object, permisos: array{exportar: bool}}} */
    public function consultar(ContextoMetricas $contexto, ConsultarReporteTenantDto $filtros): array
    {
        $corte = new CortesAntiguedad($contexto->fechaCorte);
        $base = CuentaCobrar::query()->withoutGlobalScope(SucursalScope::class)
            ->where('tenant_id', $contexto->tenantId)->where('estado', 'pendiente');
        $saldo = (clone $base)->selectRaw('
            coalesce(sum(saldo_pendiente), 0) as pendiente,
            coalesce(sum(case when fecha_vencimiento < ? then saldo_pendiente else 0 end), 0) as vencido,
            coalesce(sum(case when fecha_vencimiento is null or fecha_vencimiento >= ? then saldo_pendiente else 0 end), 0) as al_dia,
            coalesce(sum(case when fecha_vencimiento >= ? and fecha_vencimiento < ? then saldo_pendiente else 0 end), 0) as vencido_1_30,
            coalesce(sum(case when fecha_vencimiento >= ? and fecha_vencimiento < ? then saldo_pendiente else 0 end), 0) as vencido_31_60,
            coalesce(sum(case when fecha_vencimiento >= ? and fecha_vencimiento < ? then saldo_pendiente else 0 end), 0) as vencido_61_90,
            coalesce(sum(case when fecha_vencimiento < ? then saldo_pendiente else 0 end), 0) as vencido_90_mas
        ', [$corte->hoy, $corte->hoy, $corte->hace30, $corte->hoy, $corte->hace60, $corte->hace30, $corte->hace90, $corte->hace60, $corte->hace90])
            ->firstOrFail();

        // cliente_nombre sin `?->`: con el operador nullsafe Scramble lo documentaba como string (ARQ-12b).
        $filasAgrupadas = (clone $base)
            ->selectRaw('cliente_id, sum(saldo_pendiente) as saldo_pendiente, count(*) as cuentas_pendientes')
            ->with('cliente:id,ulid,nombre')
            ->groupBy('cliente_id')
            ->orderByDesc('saldo_pendiente')
            ->orderBy('cliente_id')
            ->limit($filtros->limite)
            ->get();
        $ranking = [];
        foreach ($filasAgrupadas as $fila) {
            $relacion = $fila->cliente;
            $ranking[] = [
                // DAT-08: el cliente se publica por su ulid.
                'cliente_id' => $relacion === null ? null : (string) $relacion->getAttribute('ulid'),
                'cliente_nombre' => $relacion === null ? null : (string) $relacion->getAttribute('nombre'),
                'saldo_pendiente' => DecimalApi::dinero($fila->getAttribute('saldo_pendiente')),
                'cuentas_pendientes' => (int) $fila->getAttribute('cuentas_pendientes'),
            ];
        }

        $pagina = (clone $base)->with('cliente:id,ulid,nombre')->orderBy('id')->paginate($filtros->filas, ['*'], 'page', $filtros->pagina);
        $detalle = [];
        foreach ($pagina as $cuenta) {
            $relacion = $cuenta->cliente;
            $fecha = $cuenta->getRawOriginal('fecha_vencimiento');
            $detalle[] = [
                'id' => (string) $cuenta->getAttribute('ulid'),
                'cliente_nombre' => $relacion === null ? null : (string) $relacion->getAttribute('nombre'),
                'fecha_vencimiento' => $fecha === null ? null : substr((string) $fecha, 0, 10),
                'saldo_pendiente' => DecimalApi::dinero($cuenta->getAttribute('saldo_pendiente')),
            ];
        }

        return [
            'data' => [
                'fecha_corte' => $corte->hoy,
                'total_pendiente' => DecimalApi::dinero($saldo->getAttribute('pendiente')),
                'total_vencido' => DecimalApi::dinero($saldo->getAttribute('vencido')),
                'por_antiguedad' => [
                    'al_dia' => DecimalApi::dinero($saldo->getAttribute('al_dia')),
                    'vencido_1_30' => DecimalApi::dinero($saldo->getAttribute('vencido_1_30')),
                    'vencido_31_60' => DecimalApi::dinero($saldo->getAttribute('vencido_31_60')),
                    'vencido_61_90' => DecimalApi::dinero($saldo->getAttribute('vencido_61_90')),
                    'vencido_90_mas' => DecimalApi::dinero($saldo->getAttribute('vencido_90_mas')),
                ],
                'por_cliente' => $ranking,
                'detalle' => $detalle,
            ],
            'meta' => [
                'page' => $filtros->pagina,
                'rows' => $filtros->filas,
                'total' => $pagina->total(),
                /** @var array<string, string> */
                'filtros_aplicados' => (object) [],
                'permisos' => ['exportar' => false],
            ],
        ];
    }
}
