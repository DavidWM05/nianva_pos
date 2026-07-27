<?php

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resuelve el tenant activo a partir del usuario autenticado y lo deja
 * disponible en TenantContext para el resto de la request. Debe ir despues
 * del middleware de autenticacion en la pila.
 */
class ResolveTenant
{
    public function __construct(private TenantContext $tenantContext)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if (! $usuario) {
            return $next($request);
        }

        if ($usuario->tenant_id === null) {
            // Superadmin: se marca el contexto como resuelto (sin tenant), no se deja
            // "sin resolver" -- de lo contrario TenantScope lo trataria como consola/
            // sin middleware y le daria visibilidad total de forma implicita, que es
            // justo lo que no queremos.
            $this->tenantContext->set(null);

            return $next($request);
        }

        $tenant = Tenant::find($usuario->tenant_id);

        if (! $tenant || ! $tenant->activo) {
            abort(403, 'El tenant asociado a este usuario no esta disponible.');
        }

        $this->tenantContext->set($tenant);

        return $next($request);
    }
}
