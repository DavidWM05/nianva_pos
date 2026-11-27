<?php

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Exceptions\ModuloNoActivoException;
use App\Modules\Nucleo\Services\Planes;
use App\Modules\Nucleo\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige la feature del módulo y después aplica las preferencias del tenant.
 * Una preferencia null hereda los módulos concedidos. Una lista vacía los apaga.
 *
 * Uso: Route::middleware('modulo:cxc')->group(...).
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
        $tenantId = app(TenantContext::class)->id() ?? abort(403);
        app(Planes::class)->exigir($tenantId, Planes::MODULOS[$moduloSlug]);

        if (! in_array($moduloSlug, self::activos(), true)) {
            throw new ModuloNoActivoException($moduloSlug);
        }

        return $next($request);
    }

    /**
     * Módulos efectivos del tenant para el middleware y GET /sesion (API-09).
     * La sesión central conserva la lista de navegación histórica sin acceso
     * a las rutas de módulo, que requieren un tenant.
     *
     * @return list<string>
     */
    public static function activos(): array
    {
        if (! app(TenantContext::class)->get()) {
            return self::MODULOS_DEFAULT;
        }

        $plan = app(Planes::class)->deTenant(app(TenantContext::class)->id() ?? abort(403));
        $modulos = ConfiguracionTenant::actual()?->modulos_activos ?? self::MODULOS_DEFAULT;

        return array_values(array_filter($modulos, fn (string $modulo): bool => isset(Planes::MODULOS[$modulo]) && $plan->incluye(Planes::MODULOS[$modulo])));
    }
}
