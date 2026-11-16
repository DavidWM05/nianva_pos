<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Precios\Dtos\ListarListasPrecioDto;
use Illuminate\Validation\Rule;

class ListarListasPrecioRequest extends SolicitudNegocio
{
    protected function prepareForValidation(): void
    {
        $entrada = $this->query->all();
        $escalar = static fn (string $campo, string $defecto): string => is_scalar($entrada[$campo] ?? null) ? (string) $entrada[$campo] : $defecto;
        $campo = $escalar('sort_field', 'nombre');
        $valido = in_array($campo, ['id', 'nombre', 'activo'], true);
        $this->merge([
            'page' => max(1, (int) $escalar('page', '1')),
            'rows' => max(1, min(100, (int) $escalar('rows', '25'))),
            'sort_field' => $valido ? $campo : 'nombre',
            'sort_order' => $valido && $escalar('sort_order', 'asc') === 'desc' ? 'desc' : 'asc',
            'q' => trim($escalar('q', '')),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['page' => ['sometimes', 'integer', 'min:1'], 'rows' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort_field' => ['sometimes', Rule::in(['id', 'nombre', 'activo'])], 'sort_order' => ['sometimes', Rule::in(['asc', 'desc'])], 'q' => ['nullable', 'string', 'max:120']];
    }

    public function toDto(): ListarListasPrecioDto
    {
        $v = $this->validated();

        return new ListarListasPrecioDto((int) ($v['page'] ?? 1), (int) ($v['rows'] ?? 25), (string) ($v['sort_field'] ?? 'nombre'), ($v['sort_order'] ?? 'asc') === 'desc' ? 'desc' : 'asc', trim((string) ($v['q'] ?? '')));
    }
}
