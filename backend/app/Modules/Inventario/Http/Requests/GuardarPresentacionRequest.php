<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\GuardarPresentacionDto;
use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Support\CodigoEnOtroCatalogo;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

class GuardarPresentacionRequest extends SolicitudNegocio
{
    /** @return array<string,mixed> */
    public function rules(): array
    {
        $p = $this->route('presentacion');

        return ['nombre' => ['required', 'string', 'max:120'], 'factor' => ['required', 'numeric', 'decimal:0,3', 'min:0.001', 'max:99999999999.999'], 'codigo_barras' => ['nullable', 'string', 'max:50', Rule::unique('presentaciones', 'codigo_barras')->where('tenant_id', $this->tenantId())->ignore($p instanceof Presentacion ? $p->id : null), new CodigoEnOtroCatalogo('producto_variantes', $this->tenantId())], 'precio_venta' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99']];
    }

    public function toDto(): GuardarPresentacionDto
    {
        $v = $this->validated();

        return new GuardarPresentacionDto((string) $v['nombre'], (string) $v['factor'], isset($v['codigo_barras']) ? (string) $v['codigo_barras'] : null, isset($v['precio_venta']) ? (string) $v['precio_venta'] : null, array_keys($v));
    }
}
