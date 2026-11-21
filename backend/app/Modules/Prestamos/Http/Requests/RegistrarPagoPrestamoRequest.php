<?php

namespace App\Modules\Prestamos\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\Prestamos\Dtos\RegistrarPagoPrestamoDto;
use App\Modules\Tpv\Support\ReglasCaja;

class RegistrarPagoPrestamoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'monto' => 'required|numeric|min:0.01',
            // DAT-08 (D-10, cambio mínimo en módulo congelado): la sesión de caja llega por su ulid.
            'caja_sesion_id' => ['nullable', 'string', 'ulid', ReglasCaja::delTenantPorUlid($this->tenantId())],
            'notas' => 'nullable|string|max:500',
        ];
    }

    public function toDto(): RegistrarPagoPrestamoDto
    {
        $v = $this->validated();

        return new RegistrarPagoPrestamoDto(
            monto: (float) $v['monto'],
            cajaSesionId: isset($v['caja_sesion_id']) ? UlidPublico::idInterno('caja_sesiones', (string) $v['caja_sesion_id']) : null,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }
}
