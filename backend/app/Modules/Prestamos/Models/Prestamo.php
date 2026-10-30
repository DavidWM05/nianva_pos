<?php

namespace App\Modules\Prestamos\Models;

use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'proveedor_id', 'referencia', 'monto', 'interes', 'monto_a_pagar', 'saldo_pendiente', 'fecha_prestamo', 'fecha_vencimiento', 'estado', 'notas'])]
class Prestamo extends Model
{
    use BelongsToTenant;

    protected $table = 'prestamos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2', 'interes' => 'decimal:2', 'monto_a_pagar' => 'decimal:2', 'saldo_pendiente' => 'decimal:2', 'fecha_prestamo' => 'date', 'fecha_vencimiento' => 'date'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(PrestamoPago::class);
    }
}
