<?php

namespace App\Modules\VentasPlazos\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Concerns\SerializaDecimales;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Database\Factories\PlanPagoClienteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'cliente_id', 'venta_id', 'concepto', 'monto_total', 'saldo_pendiente',
    'interes_total', 'tasa_interes', 'numero_cuotas', 'periodicidad', 'fecha_inicio',
])]
class PlanPagoCliente extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<PlanPagoClienteFactory> */
    use HasFactory;

    use SerializaDecimales;
    use TieneUlid;

    const UPDATED_AT = null;

    protected $table = 'planes_pago_cliente';

    protected function casts(): array
    {
        return [
            'monto_total' => 'decimal:2',
            'saldo_pendiente' => 'decimal:2',
            'interes_total' => 'decimal:2',
            'tasa_interes' => 'decimal:2',
            'numero_cuotas' => 'integer',
            'fecha_inicio' => 'date',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    /**
     * DAT-04: la proyección del libro del plan nace igual al monto total, también en un plan
     * creado sin VentasPlazosService, como en una preparación de pruebas.
     */
    protected static function booted(): void
    {
        static::creating(static function (self $plan): void {
            if ($plan->getAttribute('saldo_pendiente') === null) {
                $plan->setAttribute('saldo_pendiente', $plan->getAttribute('monto_total'));
            }
        });
    }

    /** @return HasMany<PlanPagoMovimiento, $this> */
    public function movimientos(): HasMany
    {
        return $this->hasMany(PlanPagoMovimiento::class);
    }

    /** @return HasMany<PlanPagoClienteCuota, $this> */
    public function cuotas(): HasMany
    {
        return $this->hasMany(PlanPagoClienteCuota::class);
    }
}
