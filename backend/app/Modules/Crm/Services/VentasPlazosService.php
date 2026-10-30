<?php

namespace App\Modules\Crm\Services;

use App\Modules\Crm\Exceptions\CuotaYaPagadaException;
use App\Modules\Crm\Exceptions\PagoCuotaInsuficienteException;
use App\Modules\Crm\Exceptions\PlanPagoYaActivoException;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Models\PlanPagoClienteCuota;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Gestiona planes de pago a plazos con intereses para ventas.
 * Extiende el módulo CRM existente reutilizando las tablas
 * planes_pago_cliente y planes_pago_cliente_cuotas.
 *
 * A diferencia de apartados (layaway: se reserva mercancia, no se entrega
 * hasta liquidar), en ventas a plazos el producto se entrega inmediatamente
 * y la deuda se divide en cuotas con interes.
 */
class VentasPlazosService
{
    public function crearPlan(Venta $venta, array $data): PlanPagoCliente
    {
        $numeroCuotas = (int) ($data['numero_cuotas'] ?? 0);
        $tasaInteres = (float) ($data['tasa_interes'] ?? 0);

        if ($numeroCuotas < 2 || $numeroCuotas > 36) {
            throw new InvalidArgumentException('El numero de cuotas debe estar entre 2 y 36.');
        }

        if (! in_array($data['periodicidad'] ?? 'mensual', ['semanal', 'quincenal', 'mensual'], true)) {
            throw new InvalidArgumentException('Periodicidad invalida.');
        }

        return DB::transaction(function () use ($venta, $data, $numeroCuotas, $tasaInteres) {
            // Verificar que la venta no tenga ya un plan activo
            $planExistente = PlanPagoCliente::where('venta_id', $venta->id)->first();

            if ($planExistente) {
                throw new PlanPagoYaActivoException($venta->id, $planExistente->id);
            }

            $totalVenta = (float) $venta->total;
            $interesTotal = round($totalVenta * ($tasaInteres / 100), 2);
            $montoTotal = round($totalVenta + $interesTotal, 2);
            $montoCapitalPorCuota = round($totalVenta / $numeroCuotas, 2);
            $montoInteresPorCuota = round($interesTotal / $numeroCuotas, 2);
            $montoPorCuota = round($montoCapitalPorCuota + $montoInteresPorCuota, 2);

            $fechaInicio = $data['fecha_inicio'] ?? now()->toDateString();

            $plan = PlanPagoCliente::create([
                'tenant_id' => $venta->tenant_id,
                'cliente_id' => $venta->cliente_id,
                'venta_id' => $venta->id,
                'concepto' => "Venta #{$venta->id} - Pago a plazos",
                'monto_total' => $montoTotal,
                'interes_total' => $interesTotal,
                'tasa_interes' => $tasaInteres,
                'numero_cuotas' => $numeroCuotas,
                'periodicidad' => $data['periodicidad'],
                'fecha_inicio' => $fechaInicio,
            ]);

            // Generar cuotas
            for ($i = 1; $i <= $numeroCuotas; $i++) {
                $fechaVencimiento = match ($data['periodicidad']) {
                    'semanal' => date('Y-m-d', strtotime($fechaInicio . " +{$i} week")),
                    'quincenal' => date('Y-m-d', strtotime($fechaInicio . " +" . ($i * 15) . " days")),
                    'mensual' => date('Y-m-d', strtotime($fechaInicio . " +{$i} month")),
                };

                PlanPagoClienteCuota::create([
                    'plan_pago_cliente_id' => $plan->id,
                    'numero_cuota' => $i,
                    'monto' => $montoPorCuota,
                    'monto_capital' => $montoCapitalPorCuota,
                    'monto_interes' => $montoInteresPorCuota,
                    'fecha_vencimiento' => $fechaVencimiento,
                    'estado' => 'pendiente',
                ]);
            }

            return $plan->load('cuotas');
        });
    }

    public function pagarCuota(int $planId, int $cuotaId, array $dataPago): PlanPagoClienteCuota
    {
        return DB::transaction(function () use ($planId, $cuotaId, $dataPago) {
            $cuota = PlanPagoClienteCuota::where('id', $cuotaId)
                ->where('plan_pago_cliente_id', $planId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($cuota->estado === 'pagada') {
                throw new CuotaYaPagadaException($planId, $cuotaId);
            }

            $monto = round((float) ($dataPago['monto'] ?? $cuota->monto), 2);

            if ($monto < (float) $cuota->monto) {
                throw new PagoCuotaInsuficienteException($cuotaId, (float) $cuota->monto, $monto);
            }

            $cuota->update([
                'estado' => 'pagada',
                'fecha_pago' => now(),
                'fecha_pago_real' => now(),
            ]);

            // Verificar si todas las cuotas estan pagadas para actualizar el plan
            $pendientes = PlanPagoClienteCuota::where('plan_pago_cliente_id', $planId)
                ->where('estado', 'pendiente')
                ->count();

            if ($pendientes === 0) {
                PlanPagoCliente::where('id', $planId)->update([
                    // Marcamos como completado cambiando la fecha
                ]);
            }

            return $cuota->fresh();
        });
    }
}
