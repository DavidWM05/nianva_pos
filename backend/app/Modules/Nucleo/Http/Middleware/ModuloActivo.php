<?php

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Exceptions\ModuloNoActivoException;
use App\Modules\Nucleo\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifica que el slug del módulo esté en configuracion_tenant.modulos_activos.
 *
 * Uso: Route::middleware('modulo:cxc')->group(...)
 *
 * Si el tenant no tiene configurada la lista o el módulo no está incluido,
 * lanza ModuloNoActivoException (→ 403 con error_code 'modulo_no_activo').
 * Superadmin bypass: si no hay tenant activo (TenantContext sin resolver),
 * el middleware permite el paso sin verificar.
 *
 * Cuando no existe fila en configuracion_tenant para el tenant (tenant nuevo
 * sin configurar), se usan los MODULOS_DEFAULT como fallback para que ningún
 * módulo quede bloqueado por defecto.
 */
class ModuloActivo
{
    /**
     * Slugs de todos los módulos gateados. Debe coincidir uno a uno con
     * los Route::middleware('modulo:<slug>') en routes/api.php.
     */
    public const MODULOS_DEFAULT = [
        'cotizaciones', 'cxc', 'cxp', 'crm_avanzado', 'delivery',
        'gift_cards', 'notas_credito', 'produccion', 'ventas_plazos',
        'payroll', 'prestamos',
    ];

    public function handle(Request $request, Closure $next, string $moduloSlug): Response
    {
        $tenant = app(TenantContext::class)->get();

        if (! $tenant) {
            return $next($request);
        }

        $configuracion = ConfiguracionTenant::where('tenant_id', $tenant->id)->first();
        $activos = $configuracion?->modulos_activos ?? self::MODULOS_DEFAULT;

        if (! in_array($moduloSlug, $activos, true)) {
            throw new ModuloNoActivoException($moduloSlug);
        }

        return $next($request);
    }
}
