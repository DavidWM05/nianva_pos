<?php

namespace App\Modules\Auditoria\Http\Requests;

use App\Modules\Auditoria\Dtos\AuditoriaRegistroDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Models\Concerns\RutaPorUlid;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ListarAuditoriaRegistroRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tabla' => ['required', 'string'],
            // DAT-08: los registros que la API publica por ulid (modelo con RutaPorUlid) se piden
            // por ese ulid; el resto, por su id. toDto() traduce el ulid al id interno.
            'registro_id' => ['required', 'string', 'max:26', function (string $atributo, mixed $valor, Closure $fallar): void {
                $modelo = $this->modeloPorUlid();
                $texto = (string) $valor;
                if ($modelo === null ? ! ctype_digit($texto) : ! Str::isUlid($texto)) {
                    $fallar($modelo === null
                        ? 'El registro debe ser un id numérico.'
                        : 'El registro debe ser el ulid publicado del documento.');
                }
            }],
        ];
    }

    public function toDto(): AuditoriaRegistroDto
    {
        $v = $this->validated();
        $modelo = $this->modeloPorUlid();
        $registro = (string) $v['registro_id'];

        return new AuditoriaRegistroDto(
            tabla: (string) $v['tabla'],
            // Un ulid que no existe (o de otro tenant: el scope global lo oculta) da 0 y el
            // listado queda vacío, igual que un id inexistente.
            registroId: $modelo === null
                ? (int) $registro
                : (int) ($modelo::query()->where('ulid', strtolower($registro))->value('id') ?? 0),
        );
    }

    /**
     * Modelo auditable de la tabla pedida, si se resuelve por ulid.
     *
     * @return class-string<Model>|null
     */
    private function modeloPorUlid(): ?string
    {
        $tabla = $this->input('tabla');
        /** @var list<class-string<Model>> $auditables */
        $auditables = config('auditoria.auditables', []);
        foreach ($auditables as $clase) {
            if (in_array(RutaPorUlid::class, class_uses_recursive($clase), true) && (new $clase)->getTable() === $tabla) {
                return $clase;
            }
        }

        return null;
    }
}
