<?php

namespace App\Modules\Produccion\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['insumo_id', 'sucursal_id', 'cantidad', 'lote', 'fecha_vencimiento'])]
class InsumoStock extends Model
{
    use BelongsToTenantViaRelacion;

    public $timestamps = false;

    protected $table = 'insumo_stocks';

    protected function casts(): array
    {
        return [
            'cantidad' => 'decimal:4',
            'fecha_vencimiento' => 'date',
            'updated_at' => 'datetime',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'insumo';
    }

    public function insumo(): BelongsTo
    {
        return $this->belongsTo(Insumo::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }
}
