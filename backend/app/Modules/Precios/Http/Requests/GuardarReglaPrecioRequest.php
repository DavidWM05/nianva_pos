<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Precios\Dtos\ReglaPrecioDto;
use App\Modules\Precios\Support\ReglasPorcentajeMonto;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GuardarReglaPrecioRequest extends SolicitudNegocio
{
    private const TIPOS_CON_CANTIDAD_COMPRA = ['nxm', 'bundle'];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'prioridad' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'combinable' => ['sometimes', 'boolean'],
            'nombre' => ['required', 'string', 'max:120'],
            'tipo' => ['required', Rule::in(['porcentaje', 'monto_fijo', 'nxm', 'bundle'])],
            'porcentaje' => ReglasPorcentajeMonto::porcentaje(),
            'monto' => ReglasPorcentajeMonto::monto(),
            'cantidad_compra' => ['nullable', ...ReglasCantidad::decimal()],
            'cantidad_paga' => ['nullable', ...ReglasCantidad::decimal()],
            'precio_bundle' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
            'aplica_a' => ['required', Rule::in(['todo', 'categoria', 'producto', 'variante'])],
            'categoria_id' => ['nullable', 'integer', ReglasTenant::existe('categorias', $tenantId)],
            'producto_id' => ['nullable', 'integer', ReglasTenant::existe('productos', $tenantId)],
            'variante_id' => ['nullable', 'integer', ReglasVariante::delTenant($tenantId)],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ];
    }

    public function toDto(): ReglaPrecioDto
    {
        $v = $this->validated();

        $v += [
            'porcentaje' => null, 'monto' => null, 'cantidad_compra' => null, 'cantidad_paga' => null, 'precio_bundle' => null,
            'categoria_id' => null, 'producto_id' => null, 'variante_id' => null,
            'fecha_inicio' => null, 'fecha_fin' => null,
        ];

        $tipo = (string) $v['tipo'];
        $aplicaA = (string) $v['aplica_a'];

        $tieneCantidadCompra = in_array($tipo, self::TIPOS_CON_CANTIDAD_COMPRA, true);
        $tieneCantidadPaga = $tipo === 'nxm';
        $tienePrecioBundle = $tipo === 'bundle';

        $errores = ReglasPorcentajeMonto::errores($tipo, $v['porcentaje'], $v['monto'], 'reglas');

        if ($tieneCantidadCompra && $v['cantidad_compra'] === null) {
            $errores['cantidad_compra'] = ['La cantidad de compra es obligatoria para este tipo de regla.'];
        }
        if ($tieneCantidadPaga && $v['cantidad_paga'] === null) {
            $errores['cantidad_paga'] = ['La cantidad que paga es obligatoria para reglas nxm.'];
        }
        if ($tienePrecioBundle && $v['precio_bundle'] === null) {
            $errores['precio_bundle'] = ['El precio del bundle es obligatorio para este tipo de regla.'];
        }

        if ($aplicaA === 'categoria' && $v['categoria_id'] === null) {
            $errores['categoria_id'] = ['Selecciona una categoría.'];
        }
        if ($aplicaA === 'producto' && $v['producto_id'] === null) {
            $errores['producto_id'] = ['Selecciona un producto.'];
        }
        if ($aplicaA === 'variante' && $v['variante_id'] === null) {
            $errores['variante_id'] = ['Selecciona una variante.'];
        }

        if ($errores !== []) {
            throw ValidationException::withMessages($errores);
        }

        $v['cantidad_compra'] = $tieneCantidadCompra ? $v['cantidad_compra'] : null;
        $v['cantidad_paga'] = $tieneCantidadPaga ? $v['cantidad_paga'] : null;
        $v['precio_bundle'] = $tienePrecioBundle ? $v['precio_bundle'] : null;

        $v['categoria_id'] = $aplicaA === 'categoria' ? $v['categoria_id'] : null;
        $v['producto_id'] = $aplicaA === 'producto' ? $v['producto_id'] : null;
        $v['variante_id'] = $aplicaA === 'variante' ? $v['variante_id'] : null;

        return new ReglaPrecioDto(
            prioridad: isset($v['prioridad']) ? (int) $v['prioridad'] : null,
            combinable: isset($v['combinable']) ? (bool) $v['combinable'] : null,
            nombre: (string) $v['nombre'],
            tipo: $tipo,
            porcentaje: ReglasPorcentajeMonto::porcentajeDelTipo($tipo, $v['porcentaje']),
            monto: ReglasPorcentajeMonto::montoDelTipo($tipo, $v['monto']),
            cantidadCompra: $v['cantidad_compra'] === null ? null : Cantidad::numero($v['cantidad_compra']),
            cantidadPaga: $v['cantidad_paga'] === null ? null : Cantidad::numero($v['cantidad_paga']),
            precioBundle: $v['precio_bundle'] === null ? null : (float) $v['precio_bundle'],
            aplicaA: $aplicaA,
            categoriaId: $v['categoria_id'] === null ? null : (int) $v['categoria_id'],
            productoId: $v['producto_id'] === null ? null : (int) $v['producto_id'],
            varianteId: $v['variante_id'] === null ? null : (int) $v['variante_id'],
            fechaInicio: $v['fecha_inicio'] === null ? null : (string) $v['fecha_inicio'],
            fechaFin: $v['fecha_fin'] === null ? null : (string) $v['fecha_fin'],
        );
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['cantidad_compra', 'cantidad_paga']);
    }
}
