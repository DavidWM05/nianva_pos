<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\SucursalOperacion;
use App\Modules\Produccion\Dtos\InsumoStockDto;

class GuardarInsumoStockRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sucursal_id' => ['nullable', 'integer', ReglasTenant::existe('sucursales', $this->tenantId())],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'lote' => ['nullable', 'string', 'max:50'],
            'fecha_vencimiento' => ['nullable', 'date'],
        ];
    }

    public function toDto(): InsumoStockDto
    {
        $v = $this->validated();
        $usuario = $this->user();

        if ($usuario === null) {
            abort(401);
        }

        return new InsumoStockDto(
            sucursalId: SucursalOperacion::paraEscritura(
                $usuario,
                isset($v['sucursal_id']) ? (int) $v['sucursal_id'] : null,
            ),
            cantidad: (float) $v['cantidad'],
            lote: isset($v['lote']) ? (string) $v['lote'] : null,
            fechaVencimiento: isset($v['fecha_vencimiento']) ? (string) $v['fecha_vencimiento'] : null,
        );
    }
}
