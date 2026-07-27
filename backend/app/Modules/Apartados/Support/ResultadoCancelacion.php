<?php

namespace App\Modules\Apartados\Support;

use App\Modules\Apartados\Models\Apartado;

/**
 * $tieneAbonosPendientes / $montoAbonadoPendiente senalan al llamador que
 * hubo dinero cobrado antes de la cancelacion. Este modulo NO decide como
 * se reembolsa (efectivo, nota de credito, etc.) -- esa es una decision de
 * negocio fuera de su alcance; solo deja constancia de cuanto quedo
 * pendiente de resolver.
 */
final class ResultadoCancelacion
{
    public function __construct(
        public readonly Apartado $apartado,
        public readonly bool $tieneAbonosPendientes,
        public readonly float $montoAbonadoPendiente,
    ) {
    }
}
