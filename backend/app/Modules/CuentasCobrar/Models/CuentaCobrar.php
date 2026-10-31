<?php

namespace App\Modules\CuentasCobrar\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CuentasCobrar\Database\Factories\CuentaCobrarFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'venta_id', 'cliente_id', 'monto_total',
    'saldo_pendiente', 'fecha_vencimiento', 'estado',
])]
class CuentaCobrar extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<CuentaCobrarFactory> */
    use HasFactory;

    protected $table = 'cuentas_cobrar';

    protected function casts(): array
    {
        return [
            'monto_total' => 'decimal:2',
            'saldo_pendiente' => 'decimal:2',
            'fecha_vencimiento' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function abonos(): HasMany
    {
        return $this->hasMany(AbonoCuenta::class, 'cuenta_cobrar_id');
    }
}
