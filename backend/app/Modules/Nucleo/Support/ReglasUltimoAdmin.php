<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Exceptions\UltimoAdminException;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * DAT-10: el tenant conserva al menos un usuario activo con el rol admin. Las Actions que
 * desactivan a un usuario o le quitan el rol admin llaman a exigirOtroAdmin() dentro de su
 * transaccion y bloquean las filas de la consulta, para que dos admins no se
 * desactiven entre si a la vez.
 */
final class ReglasUltimoAdmin
{
    public const ROL_ADMIN = 'admin';

    /**
     * La Action pasa $bloquear, que agrega el bloqueo de filas a la consulta: los bloqueos viven
     * en las Actions, no aqui.
     *
     * @param  callable(Builder<Usuario>): Builder<Usuario>  $bloquear
     */
    public static function exigirOtroAdmin(Usuario $usuario, callable $bloquear): void
    {
        $tenantId = $usuario->getAttribute('tenant_id');

        // El superadmin (tenant_id NULL) no es el admin de ningun tenant.
        if ($tenantId === null || ! (bool) $usuario->getAttribute('activo') || ! $usuario->tieneRol(self::ROL_ADMIN)) {
            return;
        }

        $otrosAdmins = Usuario::query()
            ->withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $tenantId)
            ->whereKeyNot($usuario->getKey())
            ->where('activo', true)
            ->whereHas('roles', fn ($query) => $query->where('nombre', self::ROL_ADMIN));

        if ($bloquear($otrosAdmins)->count() === 0) {
            throw new UltimoAdminException((int) $usuario->getKey());
        }
    }
}
