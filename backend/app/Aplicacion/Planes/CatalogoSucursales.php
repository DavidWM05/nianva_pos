<?php

declare(strict_types=1);

namespace App\Aplicacion\Planes;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Services\Planes;
use Illuminate\Support\Facades\DB;

final class CatalogoSucursales
{
    public function __construct(private readonly CuotasPlan $cuotas, private readonly Planes $planes) {}

    public function aprovisionar(int $tenantId, string $nombre): Sucursal
    {
        return DB::transaction(function () use ($tenantId, $nombre): Sucursal {
            $this->cuotas->bloquear($tenantId);
            $sucursales = Sucursal::sinTenant()->where('tenant_id', $tenantId);
            $existente = (clone $sucursales)->where('nombre', $nombre)->first();
            if ($existente !== null) {
                return $existente;
            }

            $this->cuotas->exigir($tenantId, 'sucursales', 'alta');
            if ($sucursales->where('activo', true)->exists()) {
                $this->planes->exigir($tenantId, 'multisucursal');
            }

            return Sucursal::sinTenant()->create(['tenant_id' => $tenantId, 'nombre' => $nombre, 'activo' => true]);
        });
    }

    public function reactivar(Sucursal $sucursal): void
    {
        DB::transaction(function () use ($sucursal): void {
            $tenantId = $sucursal->tenant_id;
            $this->cuotas->bloquear($tenantId);
            $actual = Sucursal::sinTenant()->whereKey($sucursal->getKey())->lockForUpdate()->firstOrFail();
            if ($actual->getAttribute('activo')) {
                return;
            }

            $this->cuotas->exigir($tenantId, 'sucursales', 'reactivacion');
            if (Sucursal::sinTenant()->where('tenant_id', $tenantId)->where('activo', true)->exists()) {
                $this->planes->exigir($tenantId, 'multisucursal');
            }
            $actual->update(['activo' => true]);
        });
    }
}
