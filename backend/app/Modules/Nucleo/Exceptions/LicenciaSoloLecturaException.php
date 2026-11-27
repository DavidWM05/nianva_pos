<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class LicenciaSoloLecturaException extends ExcepcionNegocio
{
    public function __construct(private readonly string $motivo)
    {
        parent::__construct('La licencia permite consultar datos. Para guardar cambios, revisa la activación.');
    }

    public function errorCode(): string
    {
        return 'licencia_solo_lectura';
    }

    public function status(): int
    {
        return 403;
    }

    /** @return array{motivo: string} */
    public function contexto(): array
    {
        return ['motivo' => $this->motivo];
    }
}
