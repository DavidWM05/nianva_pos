<?php

namespace App\Modules\Prestamos\Services;

use App\Modules\Prestamos\Exceptions\PagoExcedeSaldoPrestamoException;
use App\Modules\Prestamos\Exceptions\PrestamoPagadoException;
use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Prestamos\Models\PrestamoPago;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class PrestamoService
{
    public function registrar(array $data): Prestamo
    {
        $monto = round((float) ($data['monto'] ?? 0), 2);
        $interes = (float) ($data['interes'] ?? 0);
        $montoAPagar = round($monto + ($monto * $interes / 100), 2);

        return DB::transaction(function () use ($data, $monto, $interes, $montoAPagar) {
            return Prestamo::create([
                'tenant_id' => $data['tenant_id'],
                'proveedor_id' => $data['proveedor_id'] ?? null,
                'referencia' => $data['referencia'] ?? null,
                'monto' => $monto,
                'interes' => $interes,
                'monto_a_pagar' => $montoAPagar,
                'saldo_pendiente' => $montoAPagar,
                'fecha_prestamo' => $data['fecha_prestamo'],
                'fecha_vencimiento' => $data['fecha_vencimiento'] ?? null,
                'estado' => 'activo',
                'notas' => $data['notas'] ?? null,
            ]);
        });
    }

    public function registrarPago(int $prestamoId, array $data): PrestamoPago
    {
        return DB::transaction(function () use ($prestamoId, $data) {
            $prestamo = Prestamo::where('id', $prestamoId)->lockForUpdate()->firstOrFail();

            if ($prestamo->estado === 'pagado') {
                throw new PrestamoPagadoException($prestamoId);
            }

            $monto = round((float) ($data['monto']), 2);

            if ($monto > (float) $prestamo->saldo_pendiente) {
                throw new PagoExcedeSaldoPrestamoException((float) $prestamo->saldo_pendiente, $monto);
            }

            $pago = PrestamoPago::create([
                'prestamo_id' => $prestamo->id,
                'caja_sesion_id' => $data['caja_sesion_id'] ?? null,
                'monto' => $monto,
                'notas' => $data['notas'] ?? null,
            ]);

            $nuevoSaldo = round((float) $prestamo->saldo_pendiente - $monto, 2);
            $prestamo->update([
                'saldo_pendiente' => $nuevoSaldo,
                'estado' => $nuevoSaldo <= 0 ? 'pagado' : 'activo',
            ]);

            return $pago;
        });
    }

    public function obtenerActivos(): Collection
    {
        return Prestamo::where('estado', 'activo')
            ->where('saldo_pendiente', '>', 0)
            ->get();
    }
}
