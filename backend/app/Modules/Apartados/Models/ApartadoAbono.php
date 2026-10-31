<?php

namespace App\Modules\Apartados\Models;

use App\Modules\Apartados\Database\Factories\ApartadoAbonoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando apartado.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['apartado_id', 'monto', 'usuario_id', 'notas'])]
class ApartadoAbono extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<ApartadoAbonoFactory> */
    use HasFactory;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'apartado_abonos';

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha' => 'datetime',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'apartado';
    }

    public function apartado(): BelongsTo
    {
        return $this->belongsTo(Apartado::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(ApartadoAbonoPago::class, 'abono_id');
    }
}
