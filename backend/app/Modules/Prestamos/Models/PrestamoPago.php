<?php

namespace App\Modules\Prestamos\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Prestamos\Database\Factories\PrestamoPagoFactory;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['prestamo_id', 'caja_sesion_id', 'monto', 'notas'])]
class PrestamoPago extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<PrestamoPagoFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'prestamo_pagos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2', 'fecha' => 'datetime'];
    }

    public static function tenantRelacion(): string
    {
        return 'prestamo';
    }

    public function prestamo(): BelongsTo
    {
        return $this->belongsTo(Prestamo::class);
    }

    public function cajaSesion(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class);
    }
}
