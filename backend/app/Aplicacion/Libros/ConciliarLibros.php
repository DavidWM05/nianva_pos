<?php

declare(strict_types=1);

namespace App\Aplicacion\Libros;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Models\CuentaCobrarMovimiento;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoMovimiento;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * DAT-04 y DAT-05: concilia cada libro de movimientos contra su proyección, en todos los tenants.
 * Para cada documento exige que el primer renglón sea saldo_inicial, que el último saldo después
 * sea igual a la proyección y que la suma de los movimientos también lo sea. Solo lee; devuelve
 * los hallazgos, uno por documento que no cuadra.
 */
final class ConciliarLibros
{
    /** @return list<string> */
    public function ejecutar(): array
    {
        return [...$this->stock(), ...$this->caja(), ...$this->dinero(
            'cuentas_cobrar', CuentaCobrar::query()->withoutGlobalScopes()->get(), 'saldo_pendiente',
            fn (Model $cuenta) => CuentaCobrarMovimiento::sinTenant()->where('cuenta_cobrar_id', $cuenta->getKey())->orderBy('id')->get(),
        ), ...$this->dinero(
            'planes_pago_cliente', PlanPagoCliente::query()->withoutGlobalScopes()->get(), 'saldo_pendiente',
            fn (Model $plan) => PlanPagoMovimiento::sinTenant()->where('plan_pago_cliente_id', $plan->getKey())->orderBy('id')->get(),
        ), ...$this->notas()];
    }

    /** @return list<string> */
    private function stock(): array
    {
        $hallazgos = [];
        foreach (InventarioStock::query()->withoutGlobalScopes()->orderBy('id')->get() as $stock) {
            $renglones = Kardex::query()->withoutGlobalScopes()
                ->where('variante_id', $stock->getAttribute('variante_id'))
                ->where('sucursal_id', $stock->getAttribute('sucursal_id'))
                ->orderBy('id')->get();
            $clave = "inventario_stock {$stock->getKey()} (variante {$stock->getAttribute('variante_id')}, sucursal {$stock->getAttribute('sucursal_id')})";
            $proyeccion = Cantidad::milesimas($stock->getAttribute('stock_actual'));

            if ($renglones->isEmpty() || $renglones->first()->getAttribute('motivo') !== 'saldo_inicial') {
                $hallazgos[] = "{$clave}: el primer movimiento no es saldo_inicial.";

                continue;
            }

            $suma = 0;
            foreach ($renglones as $renglon) {
                $cantidad = Cantidad::milesimas($renglon->getAttribute('cantidad'));
                $suma += $renglon->getAttribute('tipo') === 'salida' ? -$cantidad : $cantidad;
            }
            $ultimo = Cantidad::milesimas($renglones->last()->getAttribute('stock_despues'));
            if ($ultimo !== $proyeccion || $suma !== $proyeccion) {
                $hallazgos[] = "{$clave}: proyección {$proyeccion}, último stock después {$ultimo}, suma {$suma} (milésimas).";
            }
        }

        return $hallazgos;
    }

    /** @return list<string> */
    private function caja(): array
    {
        $hallazgos = [];
        foreach (CajaSesion::query()->withoutGlobalScopes()->orderBy('id')->get() as $caja) {
            $saldos = CajaSesionSaldo::query()->withoutGlobalScopes()->where('caja_sesion_id', $caja->getKey())->orderBy('metodo_pago_id')->get();
            if ($saldos->isEmpty()) {
                $hallazgos[] = "caja_sesiones {$caja->getKey()}: el primer movimiento no es saldo_inicial.";

                continue;
            }
            $suma = Dinero::desde('0');
            foreach ($saldos as $saldo) {
                $metodoId = (int) $saldo->getAttribute('metodo_pago_id');
                $renglones = CajaMovimiento::sinTenant()->where('caja_sesion_id', $caja->getKey())->where('metodo_pago_id', $metodoId)->orderBy('id')->get();
                $hallazgo = $this->cuadra($renglones, (string) $saldo->getAttribute('saldo_teorico'), static fn (Model $r): string => (string) $r->getAttribute('monto'));
                if ($hallazgo !== null) {
                    $hallazgos[] = "caja_sesiones {$caja->getKey()}, método {$metodoId}: {$hallazgo}";
                }
                $suma = $suma->sumar(Dinero::desde((string) $saldo->getAttribute('saldo_teorico')));
            }
            if ($suma->aCadena() !== Dinero::desde((string) $caja->getAttribute('saldo_teorico'))->aCadena()) {
                $hallazgos[] = "caja_sesiones {$caja->getKey()}: la suma de los métodos no coincide con la proyección del encabezado.";
            }
            $sinSaldo = CajaMovimiento::sinTenant()->where('caja_sesion_id', $caja->getKey())->whereNotIn('metodo_pago_id', $saldos->pluck('metodo_pago_id'))->exists();
            if ($sinSaldo) {
                $hallazgos[] = "caja_sesiones {$caja->getKey()}: hay movimientos sin proyección de su método.";
            }
        }

        return $hallazgos;
    }

    /**
     * Libros de dinero con monto con signo (caja, cuentas por cobrar y planes).
     *
     * @param  Collection<int, covariant Model>  $documentos
     * @param  callable(Model): Collection<int, covariant Model>  $renglonesDe
     * @return list<string>
     */
    private function dinero(string $libro, Collection $documentos, string $columna, callable $renglonesDe): array
    {
        $hallazgos = [];
        foreach ($documentos as $documento) {
            $renglones = $renglonesDe($documento);
            $hallazgo = $this->cuadra($renglones, (string) $documento->getAttribute($columna), static fn (Model $r): string => (string) $r->getAttribute('monto'));
            if ($hallazgo !== null) {
                $hallazgos[] = "{$libro} {$documento->getKey()}: {$hallazgo}";
            }
        }

        return $hallazgos;
    }

    /** @return list<string> */
    private function notas(): array
    {
        $hallazgos = [];
        foreach (NotaCredito::query()->withoutGlobalScopes()->get() as $nota) {
            $renglones = NotaCreditoUso::query()->withoutGlobalScopes()->where('nota_credito_id', $nota->getKey())->orderBy('id')->get();
            // En este libro el monto va sin signo: el saldo inicial suma y cada uso resta.
            $hallazgo = $this->cuadra($renglones, (string) $nota->getAttribute('saldo_disponible'), static fn (Model $r): string => $r->getAttribute('tipo') === 'uso'
                ? Dinero::desde('0')->restar(Dinero::desde((string) $r->getAttribute('monto_usado')))->aCadena()
                : (string) $r->getAttribute('monto_usado'));
            if ($hallazgo !== null) {
                $hallazgos[] = "notas_credito {$nota->getKey()}: {$hallazgo}";
            }
        }

        return $hallazgos;
    }

    /**
     * @param  Collection<int, covariant Model>  $renglones
     * @param  callable(Model): string  $montoDe
     */
    private function cuadra(Collection $renglones, string $proyeccion, callable $montoDe): ?string
    {
        $primero = $renglones->first();
        if (! $primero instanceof Model || $primero->getAttribute('tipo') !== 'saldo_inicial') {
            return 'el primer movimiento no es saldo_inicial.';
        }

        $suma = Dinero::desde('0');
        foreach ($renglones as $renglon) {
            $suma = $suma->sumar(Dinero::desde($montoDe($renglon)));
        }
        $esperado = Dinero::desde($proyeccion)->aCadena();
        $ultimo = Dinero::desde((string) $renglones->last()?->getAttribute('saldo_despues'))->aCadena();

        return $ultimo === $esperado && $suma->aCadena() === $esperado
            ? null
            : "proyección {$esperado}, último saldo después {$ultimo}, suma {$suma->aCadena()}.";
    }
}
