<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Console\Commands;

use App\Aplicacion\Libros\ConciliarLibros;
use Illuminate\Console\Command;

/**
 * DAT-04 y DAT-05: verifica que cada libro de movimientos (stock, caja, cuentas por cobrar, planes
 * de pago y notas de crédito) cuadre con su proyección y empiece con saldo_inicial. Solo reporta.
 */
class ConciliarLibrosCommand extends Command
{
    protected $signature = 'conciliar:libros';

    protected $description = 'Concilia cada libro de movimientos con su saldo y exige el saldo inicial.';

    public function handle(ConciliarLibros $conciliar): int
    {
        $hallazgos = $conciliar->ejecutar();

        foreach ($hallazgos as $hallazgo) {
            $this->error($hallazgo);
        }

        if ($hallazgos !== []) {
            $this->error(count($hallazgos).' documento(s) no cuadran.');

            return self::FAILURE;
        }

        $this->info('Los libros cuadran con sus saldos.');

        return self::SUCCESS;
    }
}
