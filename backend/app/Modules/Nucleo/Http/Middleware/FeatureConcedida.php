<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Middleware;

use App\Modules\Nucleo\Services\Planes;
use App\Modules\Nucleo\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class FeatureConcedida
{
    public function __construct(private readonly Planes $planes, private readonly TenantContext $tenant) {}

    public function handle(Request $request, Closure $next, string ...$features): Response
    {
        $tenantId = $this->tenant->id();
        if ($tenantId === null && in_array('central', $features, true)) {
            return $next($request);
        }
        abort_if($tenantId === null, 403);
        foreach (array_diff($features, ['central']) as $feature) {
            $this->planes->exigir($tenantId, $feature);
        }

        return $next($request);
    }
}
