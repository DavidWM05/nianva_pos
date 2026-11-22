<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

final class DatosImpreso
{
    /** @return array{encabezado:array{empresa:string,rfc:?string,telefono:?string,logo_url:?string,sucursal:string,folio:?string,fecha:?string,usuario:?string},pie:array{mensaje_ticket:?string}} */
    public static function de(?Model $sucursal, ?Model $usuario, ?string $folio, ?DateTimeInterface $fecha): array
    {
        if (! $sucursal instanceof Sucursal) {
            throw new \LogicException('El documento requiere una sucursal.');
        }

        $tenantId = (int) $sucursal->getAttribute('tenant_id');
        $tenant = Tenant::query()->findOrFail($tenantId);
        $config = ConfiguracionTenant::query()->where('tenant_id', $tenantId)->first();
        $rfc = $tenant->getAttribute('rfc');
        $telefono = $tenant->getAttribute('telefono');
        $logo = $config?->getAttribute('logo_url');
        $mensaje = $config?->getAttribute('mensaje_ticket');

        return [
            'encabezado' => [
                'empresa' => (string) ($tenant->getAttribute('razon_social') ?: $tenant->getAttribute('nombre')),
                'rfc' => $config?->getAttribute('mostrar_rfc') && is_string($rfc) ? $rfc : null,
                'telefono' => $config?->getAttribute('mostrar_telefono') && is_string($telefono) ? $telefono : null,
                'logo_url' => is_string($logo) ? $logo : null,
                'sucursal' => (string) $sucursal->getAttribute('nombre'),
                'folio' => $folio,
                'fecha' => $fecha?->format(DATE_ATOM),
                'usuario' => $usuario instanceof Usuario ? trim($usuario->getAttribute('nombre').' '.$usuario->getAttribute('apellido')) : null,
            ],
            'pie' => ['mensaje_ticket' => is_string($mensaje) ? $mensaje : null],
        ];
    }
}
