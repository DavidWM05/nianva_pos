<?php

namespace App\Modules\Prestamos\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PagoExcedeSaldoPrestamoException extends ExcepcionNegocio
{
    public float $saldoPendiente;
    public float $montoPago;

    public function __construct(float $saldoPendiente, float $montoPago)
    {
        parent::__construct("El pago ({$montoPago}) excede el saldo pendiente ({$saldoPendiente}) del préstamo.");
        $this->saldoPendiente = $saldoPendiente;
        $this->montoPago = $montoPago;
    }

    public function errorCode(): string
    {
        return 'pago_excede_saldo_prestamo';
    }

    public function contexto(): array
    {
        return [
            'saldo_pendiente' => $this->saldoPendiente,
            'monto_pago' => $this->montoPago,
        ];
    }
}
