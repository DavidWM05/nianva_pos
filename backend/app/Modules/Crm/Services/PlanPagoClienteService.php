<?php

namespace App\Modules\Crm\Services;

use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Models\PlanPagoClienteCuota;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PlanPagoClienteService
{
    /**
     * Divide monto_total en $numeroCuotas partes iguales, con vencimiento
     * mensual consecutivo desde fecha_inicio (cuota 1 = fecha_inicio, cuota
     * 2 = +1 mes, etc.). El reparto se hace en centavos para no perder
     * precision de punto flotante; si no divide exacto, la ULTIMA cuota
     * absorbe el residuo, para que la suma siempre cierre con monto_total.
     *
     * @return Collection<int, PlanPagoClienteCuota>
     */
    public function generarCuotas(PlanPagoCliente $plan, int $numeroCuotas): Collection
    {
        if ($numeroCuotas < 1) {
            throw new InvalidArgumentException('El numero de cuotas debe ser al menos 1.');
        }

        return DB::transaction(function () use ($plan, $numeroCuotas) {
            $totalCentavos = (int) round(((float) $plan->monto_total) * 100);
            $montoBaseCentavos = intdiv($totalCentavos, $numeroCuotas);
            $residuoCentavos = $totalCentavos - ($montoBaseCentavos * $numeroCuotas);

            $cuotas = collect();

            for ($numero = 1; $numero <= $numeroCuotas; $numero++) {
                $montoCentavos = $montoBaseCentavos + ($numero === $numeroCuotas ? $residuoCentavos : 0);

                $cuotas->push(PlanPagoClienteCuota::create([
                    'plan_pago_cliente_id' => $plan->id,
                    'numero_cuota' => $numero,
                    'monto' => $montoCentavos / 100,
                    'fecha_vencimiento' => $plan->fecha_inicio->copy()->addMonthsNoOverflow($numero - 1),
                    'estado' => 'pendiente',
                ]));
            }

            return $cuotas;
        });
    }

    public function marcarPagada(PlanPagoClienteCuota $cuota): PlanPagoClienteCuota
    {
        $cuota->update([
            'estado' => 'pagada',
            'fecha_pago' => now(),
        ]);

        return $cuota;
    }
}
