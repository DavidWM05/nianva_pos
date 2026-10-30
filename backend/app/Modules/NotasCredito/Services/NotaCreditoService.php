<?php

namespace App\Modules\NotasCredito\Services;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\NotasCredito\Exceptions\NotaCreditoExpiradaException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class NotaCreditoService
{
    public function crearDesdeDevolucion(Devolucion $devolucion): NotaCredito
    {
        return DB::transaction(function () use ($devolucion) {
            return NotaCredito::create([
                'tenant_id' => $devolucion->tenant_id,
                'cliente_id' => $devolucion->venta->cliente_id,
                'devolucion_id' => $devolucion->id,
                'monto_original' => $devolucion->monto_devolucion,
                'saldo_disponible' => $devolucion->monto_devolucion,
                'estado' => 'activa',
            ]);
        });
    }

    public function usarEnVenta(int $notaCreditoId, int $ventaId, float $monto): void
    {
        DB::transaction(function () use ($notaCreditoId, $ventaId, $monto) {
            $notaCredito = NotaCredito::where('id', $notaCreditoId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($notaCredito->estado === 'expirada') {
                throw new NotaCreditoExpiradaException($notaCreditoId);
            }

            if ((float) $notaCredito->saldo_disponible <= 0) {
                throw new NotaCreditoSinSaldoException($notaCreditoId);
            }

            if ($monto > (float) $notaCredito->saldo_disponible) {
                throw new NotaCreditoSaldoInsuficienteException($notaCreditoId);
            }

            NotaCreditoUso::create([
                'nota_credito_id' => $notaCredito->id,
                'venta_id' => $ventaId,
                'monto_usado' => $monto,
            ]);

            $nuevoSaldo = round((float) $notaCredito->saldo_disponible - $monto, 2);

            $notaCredito->update([
                'saldo_disponible' => $nuevoSaldo,
                'estado' => $nuevoSaldo <= 0 ? 'usada_total' : 'usada_parcial',
            ]);
        });
    }

    public function obtenerActivasPorCliente(int $clienteId): Collection
    {
        return NotaCredito::where('cliente_id', $clienteId)
            ->whereIn('estado', ['activa', 'usada_parcial'])
            ->where(function ($q) {
                $q->whereNull('fecha_expiracion')
                    ->orWhere('fecha_expiracion', '>=', now()->toDateString());
            })
            ->get();
    }

    public function validarParaPago(int $notaCreditoId): NotaCredito
    {
        $notaCredito = NotaCredito::findOrFail($notaCreditoId);

        if ($notaCredito->estado === 'expirada') {
            throw new NotaCreditoExpiradaException($notaCreditoId);
        }

        if ((float) $notaCredito->saldo_disponible <= 0) {
            throw new NotaCreditoSinSaldoException($notaCreditoId);
        }

        return $notaCredito;
    }
}
