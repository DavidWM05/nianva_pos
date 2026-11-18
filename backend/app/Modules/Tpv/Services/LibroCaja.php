<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Services;

use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Nucleo\Support\Proyeccion;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * DAT-04: único punto de escritura del libro de caja. Cada renglón mueve la proyección
 * caja_sesiones.saldo_teorico en la misma transacción (Proyeccion::actualizar: cero filas = falla).
 * Registra lo que hoy entra al total teórico del cierre (opción a): apertura, pagos de venta,
 * anulaciones y gastos. Los abonos, recargas, abonos de apartado y devoluciones en efectivo todavía
 * no entran al cierre y por eso tampoco al libro (deuda en la fila DAT-04).
 */
class LibroCaja
{
    public const TIPOS = ['venta', 'anulacion', 'gasto'];

    /** DAT-05: el primer renglón de una caja es la apertura; la proyección ya nace con ese monto. */
    public function saldoInicial(CajaSesion $caja, int $usuarioId): CajaMovimiento
    {
        $this->exigirTransaccion();
        $apertura = Dinero::desde((string) $caja->getAttribute('monto_apertura'))->aCadena();

        return CajaMovimiento::query()->create([
            'caja_sesion_id' => $caja->id,
            'tipo' => 'saldo_inicial',
            'monto' => $apertura,
            'saldo_antes' => '0.00',
            'saldo_despues' => $apertura,
            'usuario_id' => $usuarioId,
        ]);
    }

    /**
     * @param  string  $monto  con signo: positivo entra a la caja, negativo sale.
     */
    public function registrar(CajaSesion $caja, string $tipo, string $monto, string $referenciaTabla, int $referenciaId, int $usuarioId): CajaMovimiento
    {
        $this->exigirTransaccion();
        if (! in_array($tipo, self::TIPOS, true)) {
            throw new InvalidArgumentException("Tipo de movimiento de caja inválido: {$tipo}");
        }

        $importe = Dinero::desde($monto);
        if ($importe->aCadena() === '0.00') {
            throw new InvalidArgumentException('Un movimiento de caja necesita un monto distinto de cero.');
        }

        $antes = Dinero::desde((string) $caja->getAttribute('saldo_teorico'))->aCadena();
        $despues = Dinero::desde($antes)->sumar($importe)->aCadena();
        Proyeccion::actualizar($caja, 'saldo_teorico', $antes, ['saldo_teorico' => $despues]);

        return CajaMovimiento::query()->create([
            'caja_sesion_id' => $caja->id,
            'tipo' => $tipo,
            'referencia_tabla' => $referenciaTabla,
            'referencia_id' => $referenciaId,
            'monto' => $importe->aCadena(),
            'saldo_antes' => $antes,
            'saldo_despues' => $despues,
            'usuario_id' => $usuarioId,
        ]);
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('LibroCaja requiere una transacción abierta por una Action.');
        }
    }
}
