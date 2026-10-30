<?php

namespace App\Modules\NotasCredito\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'cliente_id', 'devolucion_id', 'monto_original',
    'saldo_disponible', 'fecha_expiracion', 'estado',
])]
class NotaCredito extends Model
{
    use BelongsToTenant;

    protected $table = 'notas_credito';

    protected function casts(): array
    {
        return [
            'monto_original' => 'decimal:2',
            'saldo_disponible' => 'decimal:2',
            'fecha_expiracion' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
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

    public function devolucion(): BelongsTo
    {
        return $this->belongsTo(Devolucion::class);
    }

    public function usos(): HasMany
    {
        return $this->hasMany(NotaCreditoUso::class);
    }
}
