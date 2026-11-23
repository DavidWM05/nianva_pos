<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ConsultaMetricasSucursalDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;

final class ConsultarMetricasSucursalRequest extends SolicitudNegocio
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'sucursal_id' => ['sometimes', 'integer', 'min:1'],
            'fecha_desde' => ['sometimes', 'date_format:Y-m-d'],
            'fecha_hasta' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:fecha_desde'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'rows' => ['sometimes', 'integer', 'between:1,100'],
        ];
    }

    public function toDto(): ConsultaMetricasSucursalDto
    {
        $usuario = $this->user();
        abort_unless($usuario instanceof Usuario, 401);
        $datos = $this->validated();

        return new ConsultaMetricasSucursalDto(
            SucursalOperacion::paraFiltro($usuario, isset($datos['sucursal_id']) ? (int) $datos['sucursal_id'] : null),
            $datos['fecha_desde'] ?? null,
            $datos['fecha_hasta'] ?? null,
            isset($datos['page']) ? (int) $datos['page'] : 1,
            isset($datos['rows']) ? (int) $datos['rows'] : 25,
        );
    }
}
