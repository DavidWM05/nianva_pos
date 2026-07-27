<?php

namespace App\Modules\Devoluciones\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'sucursal_id', 'venta_id', 'venta_sombra_id', 'usuario_id',
    'tipo', 'monto_devolucion', 'monto_cambio', 'diferencia', 'motivo',
])]
class Devolucion extends Model
{
    use BelongsToTenant;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'devoluciones';

    protected function casts(): array
    {
        return [
            'monto_devolucion' => 'decimal:2',
            'monto_cambio' => 'decimal:2',
            'diferencia' => 'decimal:2',
            'fecha' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    /**
     * Venta generada si tipo=cambio (es_venta_sombra=true). Permite
     * devolucion recursiva: esta misma venta puede ser a su vez el origen
     * (venta_id) de un cambio posterior -- ver
     * DevolucionService::registrarDevolucion().
     */
    public function ventaSombra(): BelongsTo
    {
        return $this->belongsTo(Venta::class, 'venta_sombra_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DevolucionItem::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(DevolucionPago::class);
    }
}
