<?php

namespace App\Modules\Auditoria\Models;

use App\Modules\Auditoria\Database\Factories\AuditoriaFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de auditoria de negocio (quien creo/edito/elimino que). Siempre
 * pertenece a un tenant especifico (tenant_id NOT NULL en el schema), por
 * eso usa BelongsToTenant igual que los modelos del nucleo: un registro de
 * auditoria de un tenant nunca debe filtrarse a otro.
 */
#[Fillable(['tenant_id', 'tabla_afectada', 'registro_id', 'accion', 'usuario_id', 'cambios', 'ip', 'user_agent'])]
class Auditoria extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<AuditoriaFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'auditoria';

    protected function casts(): array
    {
        return [
            'cambios' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
