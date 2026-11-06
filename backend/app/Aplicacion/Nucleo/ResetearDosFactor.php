<?php

declare(strict_types=1);

namespace App\Aplicacion\Nucleo;

use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use Illuminate\Support\Facades\DB;

final class ResetearDosFactor
{
    public function __construct(private readonly TrustedDeviceService $trustedDeviceService) {}

    public function ejecutar(int $usuarioId): void
    {
        $operacion = function () use ($usuarioId) {
            $usuario = Usuario::query()->withoutGlobalScope(TenantScope::class)->whereKey($usuarioId)->lockForUpdate()->firstOrFail();
            $usuario->forceFill(['two_factor_secret' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null])->save();
            $this->trustedDeviceService->revocarTodos($usuario);
            if (config('session.driver') === 'database') {
                DB::table((string) config('session.table', 'sessions'))->where('user_id', $usuario->getKey())->delete();
            }
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
