<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ConsultarInicioDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;

final class ConsultarInicioRequest extends SolicitudNegocio
{
    /** @return array{sucursal_id: list<string>} */
    public function rules(): array
    {
        return ['sucursal_id' => ['sometimes', 'integer', 'min:1']];
    }

    public function toDto(): ConsultarInicioDto
    {
        $usuario = $this->user();
        abort_unless($usuario instanceof Usuario, 401);
        $sucursalId = $this->validated('sucursal_id');

        return new ConsultarInicioDto(SucursalOperacion::paraFiltro($usuario, $sucursalId === null ? null : (int) $sucursalId));
    }
}
