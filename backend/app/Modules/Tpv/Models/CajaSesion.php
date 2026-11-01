<?php

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Database\Factories\CajaSesionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando sucursal.tenant_id (ver tenantRelacion()).
 */
#[Fillable([
    'sucursal_id', 'usuario_id', 'monto_apertura', 'monto_cierre',
    'total_ventas_sistema', 'diferencia', 'fecha_apertura', 'fecha_cierre', 'estado',
])]
class CajaSesion extends Model
{
    use BelongsToSucursal;
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CajaSesionFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'caja_sesiones';

    protected function casts(): array
    {
        return [
            'monto_apertura' => 'decimal:2',
            'monto_cierre' => 'decimal:2',
            'total_ventas_sistema' => 'decimal:2',
            'diferencia' => 'decimal:2',
            'fecha_apertura' => 'datetime',
            'fecha_cierre' => 'datetime',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'sucursal';
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class);
    }
}
