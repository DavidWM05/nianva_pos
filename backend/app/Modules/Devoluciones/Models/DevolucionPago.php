<?php

namespace App\Modules\Devoluciones\Models;

use App\Modules\Devoluciones\Database\Factories\DevolucionPagoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\MetodoPago;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando devolucion.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['devolucion_id', 'metodo_pago_id', 'monto'])]
class DevolucionPago extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<DevolucionPagoFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'devolucion_pagos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public static function tenantRelacion(): string
    {
        return 'devolucion';
    }

    public function devolucion(): BelongsTo
    {
        return $this->belongsTo(Devolucion::class);
    }

    public function metodoPago(): BelongsTo
    {
        return $this->belongsTo(MetodoPago::class);
    }
}
