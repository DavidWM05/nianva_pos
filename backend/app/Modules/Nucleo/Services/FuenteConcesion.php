<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

interface FuenteConcesion
{
    /** @return array{plan_codigo: string, features: list<string>, cuotas: array{terminales: int, sucursales: int}}|null */
    public function para(int $tenantId): ?array;
}
