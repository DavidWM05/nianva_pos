<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Services;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\PeriodoMetricas;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\SucursalOperacion;
use DateTimeZone;
use Illuminate\Auth\Access\AuthorizationException;

final readonly class CrearContextoMetricas
{
    public function __construct(
        private TenantContext $tenant,
        private CalendarioMetricas $calendario,
    ) {}

    public function paraSucursal(Usuario $usuario, string $desde, string $hasta, ?int $solicitada = null): ContextoMetricas
    {
        $tenantId = $this->tenantDelUsuario($usuario);

        // La sucursal propia es el valor inicial, incluso con permiso sucursales.todas.
        $sucursalId = SucursalOperacion::paraEscritura($usuario, $solicitada);

        return $this->crear($tenantId, $sucursalId, $desde, $hasta);
    }

    /** La Action invoca este alcance después de autorizar un reporte de nivel tenant. */
    public function paraTenant(Usuario $usuario, string $desde, string $hasta): ContextoMetricas
    {
        return $this->crear($this->tenantDelUsuario($usuario), null, $desde, $hasta);
    }

    private function tenantDelUsuario(Usuario $usuario): int
    {
        $tenantId = $this->tenant->id();
        if ($tenantId === null || (int) $usuario->getAttribute('tenant_id') !== $tenantId) {
            throw new AuthorizationException('No hay un tenant autorizado para consultar métricas.');
        }

        return $tenantId;
    }

    private function crear(int $tenantId, ?int $sucursalId, string $desde, string $hasta): ContextoMetricas
    {
        $zona = new DateTimeZone(ConfiguracionTenant::actual()->zona_horaria ?? 'America/Mexico_City');

        return new ContextoMetricas(
            $tenantId,
            $sucursalId,
            $zona,
            PeriodoMetricas::entre($desde, $hasta, $zona),
            $this->calendario->fechaLocal($zona),
        );
    }
}
