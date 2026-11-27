<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\GuardarTerminalDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\SucursalOperacion;

final class GuardarTerminalRequest extends SolicitudNegocio
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'activo' => ['sometimes', 'boolean'],
            'nombre' => ['required', 'string', 'max:100'],
            'sucursal_id' => ['required', 'integer', ReglasTenant::existe('sucursales', $this->tenantId())],
        ];
    }

    public function toDto(): GuardarTerminalDto
    {
        $usuario = $this->user();
        abort_unless($usuario instanceof Usuario && ! $usuario->esSuperadmin(), 403);

        return new GuardarTerminalDto(
            (string) $this->validated('nombre'),
            SucursalOperacion::paraEscritura($usuario, (int) $this->validated('sucursal_id')),
            $this->has('activo') ? $this->boolean('activo') : null,
        );
    }
}
