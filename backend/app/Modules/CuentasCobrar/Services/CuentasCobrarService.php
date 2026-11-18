<?php

declare(strict_types=1);

namespace App\Modules\CuentasCobrar\Services;

use App\Modules\CuentasCobrar\Exceptions\AbonoExcedeSaldoException;
use App\Modules\CuentasCobrar\Exceptions\CuentaAnuladaException;
use App\Modules\CuentasCobrar\Exceptions\CuentaConAbonosException;
use App\Modules\CuentasCobrar\Exceptions\CuentaYaPagadaException;
use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Models\CuentaCobrarMovimiento;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Nucleo\Support\Proyeccion;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Unico punto de entrada para gestionar cuentas por cobrar y sus abonos.
 */
class CuentasCobrarService
{
    /**
     * Crea una CxC automaticamente al marcar venta como credito.
     */
    public function crearDesdeVenta(Venta $venta, int $diasCredito = 30): CuentaCobrar
    {
        $this->exigirTransaccion();

        $fechaVencimiento = now()->addDays($diasCredito)->toDateString();

        $cuenta = CuentaCobrar::create([
            'tenant_id' => $venta->tenant_id,
            'venta_id' => $venta->id,
            'cliente_id' => $venta->cliente_id,
            'monto_total' => $venta->total,
            'saldo_pendiente' => $venta->total,
            'fecha_vencimiento' => $fechaVencimiento,
            'estado' => 'pendiente',
        ]);

        // DAT-05: el primer renglón del libro de la cuenta es su monto.
        $saldo = Dinero::desde((string) $cuenta->getAttribute('saldo_pendiente'))->aCadena();
        CuentaCobrarMovimiento::query()->create([
            'cuenta_cobrar_id' => $cuenta->id,
            'tipo' => 'saldo_inicial',
            'referencia_tabla' => 'ventas',
            'referencia_id' => $venta->id,
            'monto' => $saldo,
            'saldo_antes' => '0.00',
            'saldo_despues' => $saldo,
            'usuario_id' => $venta->getAttribute('usuario_id'),
        ]);

        return $cuenta;

    }

    /**
     * Registra un abono, actualiza saldo, cambia estado si corresponde.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws AbonoExcedeSaldoException
     * @throws CuentaYaPagadaException
     * @throws CuentaAnuladaException
     * @throws CajaSesionNoAbiertaException
     */
    public function registrarAbonoConBloqueos(CuentaCobrar $cuenta, array $data, ?CajaSesion $cajaSesion): AbonoCuenta
    {
        $this->exigirTransaccion();

        $cuentaId = (int) $cuenta->getKey();

        if ($cuenta->estado === 'pagada') {
            throw new CuentaYaPagadaException($cuentaId);
        }

        if ($cuenta->estado === 'anulada') {
            throw new CuentaAnuladaException($cuentaId);
        }

        $monto = round((float) ($data['monto']), 2);

        if ($monto > (float) $cuenta->saldo_pendiente) {
            throw new AbonoExcedeSaldoException((float) $cuenta->saldo_pendiente, $monto);
        }

        if (! $cajaSesion) {
            throw new CajaSesionNoAbiertaException($data['sucursal_id']);
        }

        $abono = AbonoCuenta::create([
            'cuenta_cobrar_id' => $cuenta->id,
            'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $data['usuario_id'],
            'monto' => $monto,
            'metodo_pago_id' => $data['metodo_pago_id'],
            'referencia' => $data['referencia'] ?? null,
        ]);

        // Actualizar saldo pendiente: DAT-04, la proyección y su renglón en la misma transacción.
        $antes = Dinero::desde((string) $cuenta->getAttribute('saldo_pendiente'))->aCadena();
        $despues = Dinero::desde($antes)->restar(Dinero::desde(number_format($monto, 2, '.', '')))->aCadena();
        Proyeccion::actualizar($cuenta, 'saldo_pendiente', $antes, [
            'saldo_pendiente' => $despues,
            'estado' => (float) $despues <= 0 ? 'pagada' : 'pendiente',
        ]);
        CuentaCobrarMovimiento::query()->create([
            'cuenta_cobrar_id' => $cuenta->id,
            'tipo' => 'abono',
            'referencia_tabla' => 'abonos_cuenta',
            'referencia_id' => $abono->id,
            'monto' => Dinero::desde('0')->restar(Dinero::desde(number_format($monto, 2, '.', '')))->aCadena(),
            'saldo_antes' => $antes,
            'saldo_despues' => $despues,
            'usuario_id' => $data['usuario_id'],
        ]);

        return $abono;

    }

    /**
     * Anula la cuenta (solo si no tiene abonos).
     *
     * @throws CuentaConAbonosException
     */
    public function anularConCuenta(CuentaCobrar $cuenta): void
    {
        $this->exigirTransaccion();

        $cuentaId = (int) $cuenta->getKey();

        $tieneAbonos = AbonoCuenta::where('cuenta_cobrar_id', $cuentaId)->exists();

        if ($tieneAbonos) {
            throw new CuentaConAbonosException($cuentaId);
        }

        $cuenta->update(['estado' => 'anulada']);

    }

    public function obtenerResumenPorCliente(int $clienteId): array
    {
        $cuentas = CuentaCobrar::where('cliente_id', $clienteId)
            ->where('estado', 'pendiente')
            ->get();

        return [
            'cliente_id' => $clienteId,
            'total_pendiente' => round((float) $cuentas->sum('saldo_pendiente'), 2),
            'cantidad_cuentas' => $cuentas->count(),
        ];
    }

    public function obtenerVencidas(): Collection
    {
        return CuentaCobrar::where('estado', 'pendiente')
            ->where('fecha_vencimiento', '<', now()->toDateString())
            ->get();
    }

    /** El modelo recibido debe haberse leído con bloqueo en la Action llamadora. */
    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('La escritura de saldos requiere una transacción activa.');
        }
    }
}
