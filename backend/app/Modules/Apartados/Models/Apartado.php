<?php

namespace App\Modules\Apartados\Models;

use App\Modules\Crm\Models\Cliente;
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
    'tenant_id', 'sucursal_id', 'cliente_id', 'usuario_id', 'venta_id',
    'total', 'total_abonado', 'estado', 'fecha_vencimiento', 'fecha_completado',
    'fecha_cancelado', 'usuario_cancelacion_id', 'motivo_cancelacion', 'notas',
])]
class Apartado extends Model
{
    use BelongsToTenant;

    const CREATED_AT = 'fecha_creacion';

    const UPDATED_AT = null;

    protected $table = 'apartados';

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'total_abonado' => 'decimal:2',
            'fecha_creacion' => 'datetime',
            'fecha_vencimiento' => 'date',
            'fecha_completado' => 'datetime',
            'fecha_cancelado' => 'datetime',
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

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function usuarioCancelacion(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_cancelacion_id');
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(ApartadoDetalle::class);
    }

    public function abonos(): HasMany
    {
        return $this->hasMany(ApartadoAbono::class);
    }
}
