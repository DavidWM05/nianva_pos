<?php

namespace App\Modules\GiftCards\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'cliente_id', 'codigo', 'saldo_inicial',
    'saldo_actual', 'fecha_expiracion', 'estado',
])]
class GiftCard extends Model
{
    use BelongsToTenant;

    protected $table = 'gift_cards';

    protected function casts(): array
    {
        return [
            'saldo_inicial' => 'decimal:2',
            'saldo_actual' => 'decimal:2',
            'fecha_expiracion' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class); }
    public function cliente(): BelongsTo { return $this->belongsTo(Cliente::class); }
    public function recargas(): HasMany { return $this->hasMany(GiftCardRecarga::class); }
}
