<?php

namespace App\Modules\Auditoria\Http\Requests;

use App\Modules\Auditoria\Dtos\AuditoriaFiltrosDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class FiltrarAuditoriaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tabla' => ['nullable', 'string'],
            'usuario_id' => ['nullable', 'integer'],
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
        ];
    }

    public function toDto(): AuditoriaFiltrosDto
    {
        $v = $this->validated();

        return new AuditoriaFiltrosDto(
            tabla: isset($v['tabla']) ? (string) $v['tabla'] : null,
            usuarioId: isset($v['usuario_id']) ? (int) $v['usuario_id'] : null,
            fechaDesde: isset($v['fecha_desde']) ? (string) $v['fecha_desde'] : null,
            fechaHasta: isset($v['fecha_hasta']) ? (string) $v['fecha_hasta'] : null,
        );
    }
}
