<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Database\Factories\InstalacionNucleoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Identificador estable de ESTA instalación de Núcleo (no de un tenant --
 * ver la migración). Se usa en cada llamada a LicenciaClienteService para
 * que el servidor central de licencias pueda distinguir "mismo tenant,
 * instalación distinta" (ej. alguien copió la base de datos a un segundo
 * servidor) de una revalidación legítima.
 *
 * Tabla de una sola fila: `identificador()` la crea la primera vez que se
 * necesita (lazy) y la reutiliza siempre después -- nunca se regenera.
 * Sin tenant_id, sin BelongsToTenant: no es un dato de negocio de ningún
 * tenant, es la identidad de la instalación misma.
 */
#[Fillable(['identificador'])]
class InstalacionNucleo extends Model
{
    /** @use HasFactory<InstalacionNucleoFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'instalacion_nucleo';

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public static function identificador(): string
    {
        $fila = static::query()->first();

        if ($fila === null) {
            $fila = static::create(['identificador' => (string) Str::uuid()]);
        }

        return $fila->identificador;
    }
}
