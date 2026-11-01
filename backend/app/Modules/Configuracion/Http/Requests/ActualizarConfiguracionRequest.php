<?php

namespace App\Modules\Configuracion\Http\Requests;

use App\Modules\Configuracion\Dtos\ConfiguracionTenantDto;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

class ActualizarConfiguracionRequest extends SolicitudNegocio
{
    private ?ConfiguracionTenant $configuracionActual = null;

    public function authorize(): bool
    {
        $this->configuracionActual = ConfiguracionTenant::actual();

        if ($this->configuracionActual === null) {
            abort(404, 'No hay un tenant activo.');
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'moneda' => ['required', 'string', 'max:5'],
            'zona_horaria' => ['sometimes', 'string', 'timezone:all'],
            'mensaje_ticket' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'string', 'max:500', 'url'],
            'mostrar_rfc' => ['required', 'boolean'],
            'mostrar_telefono' => ['required', 'boolean'],
            'mostrar_correo' => ['required', 'boolean'],
            'backup_auto' => ['required', 'boolean'],
            'backup_frecuencia' => ['required', Rule::in(['diario', 'semanal', 'mensual'])],
            'codigo_barras_automatico' => ['required', 'boolean'],
        ];
    }

    public function configuracion(): ConfiguracionTenant
    {
        if ($this->configuracionActual === null) {
            abort(404, 'No hay un tenant activo.');
        }

        return $this->configuracionActual;
    }

    public function toDto(): ConfiguracionTenantDto
    {
        $v = $this->validated();

        return new ConfiguracionTenantDto(
            moneda: (string) $v['moneda'],
            zonaHoraria: isset($v['zona_horaria']) ? (string) $v['zona_horaria'] : null,
            mensajeTicket: isset($v['mensaje_ticket']) ? (string) $v['mensaje_ticket'] : null,
            logoUrl: isset($v['logo_url']) ? (string) $v['logo_url'] : null,
            mostrarRfc: (bool) $v['mostrar_rfc'],
            mostrarTelefono: (bool) $v['mostrar_telefono'],
            mostrarCorreo: (bool) $v['mostrar_correo'],
            backupAuto: (bool) $v['backup_auto'],
            backupFrecuencia: (string) $v['backup_frecuencia'],
            codigoBarrasAutomatico: (bool) $v['codigo_barras_automatico'],
            presentes: array_keys($v),
        );
    }
}
