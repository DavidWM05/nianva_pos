<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

final class FuenteConcesionLicencia implements FuenteConcesion
{
    public function __construct(
        private readonly EstadoLicenciaPos $estado,
        private readonly FuenteConcesionLocal $local,
    ) {}

    public function para(int $tenantId): ?array
    {
        $licencia = $this->estado->licencia($tenantId);
        if ($licencia !== null && ($licencia->getAttribute('codigo_activacion') !== null
            || $licencia->getAttribute('token_firmado') !== null)) {
            return $this->estado->verificar($licencia)['concesion'] ?? null;
        }

        return config('licencias.permitir_concesion_local') ? $this->local->para($tenantId) : null;
    }
}
