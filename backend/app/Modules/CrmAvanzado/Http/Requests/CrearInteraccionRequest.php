<?php

namespace App\Modules\CrmAvanzado\Http\Requests;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Dtos\CrearInteraccionDto;
use App\Modules\CrmAvanzado\Support\GuardasCliente;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class CrearInteraccionRequest extends SolicitudNegocio
{
    public function authorize(): bool
    {
        $cliente = $this->route('cliente');

        if ($cliente instanceof Cliente) {
            GuardasCliente::delTenant($cliente, $this->user());
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', 'string', 'in:llamada,email,whatsapp,nota,visita'],
            'observacion' => ['required', 'string', 'max:5000'],
        ];
    }

    public function toDto(): CrearInteraccionDto
    {
        $v = $this->validated();

        return new CrearInteraccionDto(
            tipo: (string) $v['tipo'],
            observacion: (string) $v['observacion'],
        );
    }
}
