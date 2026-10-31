<?php

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;

final class TenantParaFactory
{
    public static function id(): int
    {
        $tenantId = app(TenantContext::class)->id();

        if ($tenantId !== null) {
            return $tenantId;
        }

        return Tenant::factory()->create()->id;
    }
}
