<?php

namespace App\Modules\CuentasPagar\Models;

use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'compra_id', 'proveedor_id', 'monto_total',
    'saldo_pendiente', 'fecha_vencimiento', 'estado',
])]
class CuentaPagar extends Model
{
    use BelongsToTenant;

    protected $table = 'cuentas_pagar';

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

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function abonos(): HasMany
    {
        return $this->hasMany(AbonoPagar::class, 'cuenta_pagar_id');
    }
}
