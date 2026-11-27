<?php

declare(strict_types=1);

namespace App\Aplicacion\Planes;

use App\Modules\Nucleo\Exceptions\LimitePlanExcedidoException;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Services\Planes;

final class CuotasPlan
{
    public function __construct(private readonly Planes $planes) {}

    public function bloquear(int $tenantId): void
    {
        Tenant::query()->whereKey($tenantId)->lockForUpdate()->firstOrFail();
    }

    /** @return array{terminales: array{maximo: int, uso: int}, sucursales: array{maximo: int, uso: int}} */
    public function estado(int $tenantId): array
    {
        $plan = $this->planes->deTenant($tenantId);

        return [
            'terminales' => ['maximo' => $plan->terminales, 'uso' => Terminal::sinTenant()->where('tenant_id', $tenantId)->where('activo', true)->count()],
            'sucursales' => ['maximo' => $plan->sucursales, 'uso' => Sucursal::sinTenant()->where('tenant_id', $tenantId)->where('activo', true)->count()],
        ];
    }

    /** @param 'terminales'|'sucursales' $recurso */
    public function exigir(int $tenantId, string $recurso, string $operacion): void
    {
        $plan = $this->planes->deTenant($tenantId);
        $limite = $recurso === 'terminales' ? $plan->terminales : $plan->sucursales;
        $consulta = $recurso === 'terminales' ? Terminal::sinTenant() : Sucursal::sinTenant();
        // La lectura bloqueante ve las altas confirmadas incluso con un snapshot previo de MySQL.
        $ids = $consulta->where('tenant_id', $tenantId)->where('activo', true)->lockForUpdate()->pluck('id')->all();
        $uso = count($ids);
        if ($uso > $limite || ($uso === $limite && $operacion !== 'apertura')) {
            throw new LimitePlanExcedidoException($recurso, $operacion, $limite, $uso);
        }
    }
}
