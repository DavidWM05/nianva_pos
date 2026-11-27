<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\Nucleo\Services\FuenteConcesion;
use App\Modules\Nucleo\Services\Planes;

final class FuenteConcesionTotal implements FuenteConcesion
{
    public function para(int $tenantId): ?array
    {
        return [
            'plan_codigo' => 'total_pruebas',
            'features' => [...Planes::BASICO, ...Planes::AVANZADO, ...Planes::PRO, ...Planes::CONGELADAS],
            'cuotas' => ['terminales' => 100, 'sucursales' => 100],
        ];
    }
}
