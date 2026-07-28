<?php

namespace App\Modules\NotasCredito\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['nota_credito_id', 'venta_id', 'monto_usado'])]
class NotaCreditoUso extends Model
{
    use BelongsToTenantViaRelacion;

    const UPDATED_AT = null;

    public $timestamps = false;

    protected $table = 'nota_credito_usos';

    protected $casts = [
        'monto_usado' => 'decimal:2',
    ];

    public static function tenantRelacion(): string { return 'notaCredito'; }

    public function notaCredito(): BelongsTo { return $this->belongsTo(NotaCredito::class); }
    public function venta(): BelongsTo { return $this->belongsTo(Venta::class); }
}
