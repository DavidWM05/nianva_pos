<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\MetodoPagoDto;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Support\GuardasDeRecurso;
use Illuminate\Validation\Rule;

class GuardarMetodoPagoRequest extends SolicitudNegocio
{
    public function authorize(): bool
    {
        $metodoPago = $this->route('metodoPago');

        if ($metodoPago instanceof MetodoPago) {
            GuardasDeRecurso::metodoPagoGlobal($metodoPago, $this->user());
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:80'],
            'tipo' => ['required', Rule::in(['efectivo', 'tarjeta', 'transferencia', 'digital', 'otro'])],
            'incluir_en_financiero' => ['required', 'boolean'],
        ];
    }

    public function toDto(): MetodoPagoDto
    {
        $v = $this->validated();

        return new MetodoPagoDto(
            nombre: (string) $v['nombre'],
            tipo: (string) $v['tipo'],
            incluirEnFinanciero: (bool) $v['incluir_en_financiero'],
        );
    }
}
