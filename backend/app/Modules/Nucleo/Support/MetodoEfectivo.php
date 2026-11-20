<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Exceptions\MetodoEfectivoNoExisteException;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Support\Facades\DB;

/** Único resolvedor del efectivo de caja: el del tenant (menor id), o el global si no tiene. */
final class MetodoEfectivo
{
    public const NOMBRE = 'Efectivo';

    /** @throws MetodoEfectivoNoExisteException */
    public static function id(): int
    {
        $tenantId = app(TenantContext::class)->id();
        if ($tenantId !== null) {
            $local = DB::table('metodos_pago')->where('tenant_id', $tenantId)->where('tipo', 'efectivo')->orderBy('id')->value('id');
            if ($local !== null) {
                return (int) $local;
            }
        }
        $id = DB::table('metodos_pago')->whereNull('tenant_id')->where('nombre', self::NOMBRE)->orderBy('id')->value('id');
        if ($id === null) {
            throw new MetodoEfectivoNoExisteException;
        }

        return (int) $id;
    }
}
