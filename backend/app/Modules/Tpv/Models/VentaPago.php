<?php

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Tpv\Database\Factories\VentaPagoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando venta.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['venta_id', 'metodo_pago_id', 'monto'])]
class VentaPago extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<VentaPagoFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'venta_pagos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public static function tenantRelacion(): string
    {
        return 'venta';
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function metodoPago(): BelongsTo
    {
        return $this->belongsTo(MetodoPago::class);
    }
}
