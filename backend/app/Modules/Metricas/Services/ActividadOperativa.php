<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Services;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Nucleo\Scopes\SucursalScope;
use App\Modules\Nucleo\Support\DecimalApi;
use DateTimeImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

final class ActividadOperativa
{
    public function gastos(ContextoMetricas $contexto): string
    {
        return DecimalApi::dinero(Gasto::query()
            ->whereHas('sucursal', fn (Builder $consulta) => $consulta->where('tenant_id', $contexto->tenantId))
            ->when($contexto->sucursalId !== null, fn ($consulta) => $consulta->where('sucursal_id', $contexto->sucursalId))
            ->where('fecha', '>=', $contexto->periodo->inicioUtc)
            ->where('fecha', '<', $contexto->periodo->finUtcExclusivo)
            ->sum('monto'));
    }

    /** @return Collection<int, Apartado> */
    public function apartadosPorVencer(ContextoMetricas $contexto): Collection
    {
        $limite = (new DateTimeImmutable($contexto->fechaCorte, $contexto->zona))->modify('+7 days');

        return Apartado::query()->withoutGlobalScope(SucursalScope::class)
            ->where('tenant_id', $contexto->tenantId)
            ->when($contexto->sucursalId !== null, fn ($consulta) => $consulta->where('sucursal_id', $contexto->sucursalId))
            ->where('estado', 'activo')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<=', $limite->format('Y-m-d'))
            ->with('cliente:id,ulid,nombre')
            ->orderBy('fecha_vencimiento')
            ->orderBy('id')
            ->limit(10)
            ->get();
    }
}
