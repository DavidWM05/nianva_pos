<?php

namespace App\Modules\CrmAvanzado\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Database\Factories\LoyaltyTransaccionFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'cliente_id', 'tipo', 'puntos',
    'referencia_tabla', 'referencia_id', 'expira_en',
])]
class LoyaltyTransaccion extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<LoyaltyTransaccionFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'loyalty_transacciones';

    protected function casts(): array
    {
        return [
            'puntos' => 'integer',
            'expira_en' => 'date',
            'created_at' => 'datetime',
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
}
