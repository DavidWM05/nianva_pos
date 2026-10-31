<?php

namespace App\Modules\VentasPlazos\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PagoCuotaInsuficienteException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $cuotaId,
        public readonly float $montoRequerido,
        public readonly float $montoRecibido,
    ) {
        parent::__construct('El monto del pago no cubre el valor total de la cuota.');
    }

    public function errorCode(): string
    {
        return 'pago_cuota_insuficiente';
    }

    public function contexto(): array
    {
        return [
            'cuota_id' => $this->cuotaId,
            'monto_requerido' => $this->montoRequerido,
            'monto_recibido' => $this->montoRecibido,
        ];
    }
}
