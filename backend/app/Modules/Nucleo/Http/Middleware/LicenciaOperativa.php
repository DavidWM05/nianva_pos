<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Nucleo\Exceptions\LicenciaSoloLecturaException;
use App\Modules\Nucleo\Services\EstadoLicenciaPos;
use App\Modules\Nucleo\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class LicenciaOperativa
{
    public function __construct(private readonly EstadoLicenciaPos $estado, private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $this->tenant->id();
        if ($tenantId !== null && ! $request->isMethodSafe()) {
            $motivo = $this->estado->motivo($this->estado->licencia($tenantId));
            if ($motivo !== null) {
                throw new LicenciaSoloLecturaException($motivo);
            }
        }

        return $next($request);
    }
}
