<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

final class FuenteConcesionLocal implements FuenteConcesion
{
    public function para(int $tenantId): ?array
    {
        return config('planes.concesiones.'.$tenantId) ?? config('planes.instalacion');
    }
}
