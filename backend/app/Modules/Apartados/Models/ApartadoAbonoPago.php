<?php

namespace App\Modules\Apartados\Models;

use App\Modules\Apartados\Database\Factories\ApartadoAbonoPagoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\MetodoPago;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio y a DOS saltos de la fila que si lo tiene: el
 * aislamiento se resuelve via BelongsToTenantViaRelacion con la relacion en
 * notacion de puntos 'abono.apartado' -- Eloquent aplica el whereHas
 * anidado y el filtro de tenant_id contra el ultimo modelo de la cadena
 * (apartados), tal como whereHas('a.b', ...) hace nativamente en Laravel.
 */
#[Fillable(['abono_id', 'metodo_pago_id', 'monto'])]
class ApartadoAbonoPago extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<ApartadoAbonoPagoFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'apartado_abono_pagos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public static function tenantRelacion(): string
    {
        return 'abono.apartado';
    }

    public function abono(): BelongsTo
    {
        return $this->belongsTo(ApartadoAbono::class, 'abono_id');
    }

    public function metodoPago(): BelongsTo
    {
        return $this->belongsTo(MetodoPago::class);
    }
}
