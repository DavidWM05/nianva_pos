<?php

declare(strict_types=1);

namespace App\Modules\NotasCredito\Services;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\NotasCredito\Exceptions\NotaCreditoExpiradaException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Nucleo\Support\Proyeccion;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class NotaCreditoService
{
    public function crearDesdeDevolucion(Devolucion $devolucion): NotaCredito
    {
        $this->exigirTransaccion();

        $nota = NotaCredito::create([
            'tenant_id' => $devolucion->tenant_id,
            'cliente_id' => $devolucion->venta->cliente_id,
            'devolucion_id' => $devolucion->id,
            'monto_original' => $devolucion->monto_devolucion,
            'saldo_disponible' => $devolucion->monto_devolucion,
            'estado' => 'activa',
        ]);

        // DAT-05: el primer renglón del libro de la nota es su monto original.
        $saldo = Dinero::desde((string) $nota->getAttribute('saldo_disponible'))->aCadena();
        NotaCreditoUso::query()->create([
            'nota_credito_id' => $nota->id,
            'tipo' => 'saldo_inicial',
            'venta_id' => null,
            'monto_usado' => $saldo,
            'saldo_antes' => '0.00',
            'saldo_despues' => $saldo,
            'usuario_id' => $devolucion->getAttribute('usuario_id'),
        ]);

        return $nota;

    }

    public function usarEnVentaConNota(NotaCredito $notaCredito, int $ventaId, float $monto): void
    {
        $this->exigirTransaccion();

        $notaCreditoId = (int) $notaCredito->getKey();

        if ($notaCredito->estado === 'expirada') {
            throw new NotaCreditoExpiradaException($notaCreditoId);
        }

        if ((float) $notaCredito->saldo_disponible <= 0) {
            throw new NotaCreditoSinSaldoException($notaCreditoId);
        }

        if ($monto > (float) $notaCredito->saldo_disponible) {
            throw new NotaCreditoSaldoInsuficienteException($notaCreditoId);
        }

        // DAT-04: el uso es un renglón del libro de la nota; la proyección se mueve en la misma
        // transacción y solo si sigue valiendo lo que se leyó.
        $antes = Dinero::desde((string) $notaCredito->getAttribute('saldo_disponible'))->aCadena();
        $importe = Dinero::desde(number_format($monto, 2, '.', ''));
        $despues = Dinero::desde($antes)->restar($importe)->aCadena();
        Proyeccion::actualizar($notaCredito, 'saldo_disponible', $antes, [
            'saldo_disponible' => $despues,
            'estado' => (float) $despues <= 0 ? 'usada_total' : 'usada_parcial',
        ]);
        NotaCreditoUso::create([
            'nota_credito_id' => $notaCredito->id,
            'tipo' => 'uso',
            'venta_id' => $ventaId,
            'monto_usado' => $importe->aCadena(),
            'saldo_antes' => $antes,
            'saldo_despues' => $despues,
            'usuario_id' => null,
        ]);

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
        return $this->validarNotaParaPago(NotaCredito::query()->findOrFail($notaCreditoId));
    }

    public function validarNotaParaPago(NotaCredito $notaCredito): NotaCredito
    {
        $notaCreditoId = (int) $notaCredito->getKey();

        if ($notaCredito->estado === 'expirada') {
            throw new NotaCreditoExpiradaException($notaCreditoId);
        }

        if ((float) $notaCredito->saldo_disponible <= 0) {
            throw new NotaCreditoSinSaldoException($notaCreditoId);
        }

        return $notaCredito;
    }

    /** El modelo recibido debe haberse leído con bloqueo en la Action llamadora. */
    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('La escritura de saldos requiere una transacción activa.');
        }
    }
}
