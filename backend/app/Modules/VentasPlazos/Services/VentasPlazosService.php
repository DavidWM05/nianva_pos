<?php

declare(strict_types=1);

namespace App\Modules\VentasPlazos\Services;

use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Nucleo\Support\Proyeccion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Exceptions\CuotaYaPagadaException;
use App\Modules\VentasPlazos\Exceptions\PagoCuotaInsuficienteException;
use App\Modules\VentasPlazos\Exceptions\PlanPagoYaActivoException;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;
use App\Modules\VentasPlazos\Models\PlanPagoMovimiento;
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
        $this->exigirTransaccion();

        $numeroCuotas = (int) ($data['numero_cuotas'] ?? 0);
        $tasaInteres = (float) ($data['tasa_interes'] ?? 0);

        if ($numeroCuotas < 2 || $numeroCuotas > 36) {
            throw new InvalidArgumentException('El numero de cuotas debe estar entre 2 y 36.');
        }

        if (! in_array($data['periodicidad'] ?? 'mensual', ['semanal', 'quincenal', 'mensual'], true)) {
            throw new InvalidArgumentException('Periodicidad invalida.');
        }

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
            'saldo_pendiente' => round($montoPorCuota * $numeroCuotas, 2),
            'interes_total' => $interesTotal,
            'tasa_interes' => $tasaInteres,
            'numero_cuotas' => $numeroCuotas,
            'periodicidad' => $data['periodicidad'],
            'fecha_inicio' => $fechaInicio,
        ]);

        // Generar cuotas
        for ($i = 1; $i <= $numeroCuotas; $i++) {
            $fechaVencimiento = match ($data['periodicidad']) {
                'semanal' => date('Y-m-d', strtotime($fechaInicio." +{$i} week")),
                'quincenal' => date('Y-m-d', strtotime($fechaInicio.' +'.($i * 15).' days')),
                'mensual' => date('Y-m-d', strtotime($fechaInicio." +{$i} month")),
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

        // DAT-05: el primer renglón del libro del plan es lo que el cliente debe en cuotas.
        $saldo = Dinero::desde((string) $plan->getAttribute('saldo_pendiente'))->aCadena();
        PlanPagoMovimiento::query()->create([
            'plan_pago_cliente_id' => $plan->id,
            'tipo' => 'saldo_inicial',
            'referencia_tabla' => 'ventas',
            'referencia_id' => $venta->id,
            'monto' => $saldo,
            'saldo_antes' => '0.00',
            'saldo_despues' => $saldo,
            'usuario_id' => $venta->getAttribute('usuario_id'),
        ]);

        return $plan->load('cuotas');

    }

    /** @param array<string, mixed> $dataPago */
    public function pagarCuotaConCuota(PlanPagoClienteCuota $cuota, array $dataPago): PlanPagoClienteCuota
    {
        $this->exigirTransaccion();

        $planId = (int) $cuota->getAttribute('plan_pago_cliente_id');
        $cuotaId = (int) $cuota->getKey();

        if ($cuota->estado === 'pagada') {
            throw new CuotaYaPagadaException($planId, $cuotaId);
        }

        $monto = round((float) ($dataPago['monto'] ?? $cuota->monto), 2);

        if ($monto < (float) $cuota->monto) {
            throw new PagoCuotaInsuficienteException($cuotaId, (float) $cuota->monto, $monto);
        }

        // El plan no tiene un estado de cierre: las cuotas pagadas determinan su liquidación.
        $cuota->update([
            'estado' => 'pagada',
            'fecha_pago' => now(),
            'fecha_pago_real' => now(),
        ]);

        // DAT-04: la cuota pagada baja el saldo del plan en su libro, en la misma transacción.
        $plan = PlanPagoCliente::query()->withoutGlobalScopes()->whereKey($planId)->firstOrFail();
        $antes = Dinero::desde((string) $plan->getAttribute('saldo_pendiente'))->aCadena();
        $importe = Dinero::desde((string) $cuota->getAttribute('monto'));
        $despues = Dinero::desde($antes)->restar($importe)->aCadena();
        Proyeccion::actualizar($plan, 'saldo_pendiente', $antes, ['saldo_pendiente' => $despues]);
        PlanPagoMovimiento::query()->create([
            'plan_pago_cliente_id' => $planId,
            'tipo' => 'pago_cuota',
            'referencia_tabla' => 'planes_pago_cliente_cuotas',
            'referencia_id' => $cuotaId,
            'monto' => Dinero::desde('0')->restar($importe)->aCadena(),
            'saldo_antes' => $antes,
            'saldo_despues' => $despues,
            'usuario_id' => null,
        ]);

        return $cuota->refresh();
    }

    /** El modelo recibido debe haberse leído con bloqueo en la Action llamadora. */
    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('La escritura de saldos requiere una transacción activa.');
        }
    }
}
