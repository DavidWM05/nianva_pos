<?php

namespace App\Modules\CrmAvanzado\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Database\Factories\CrmInteraccionFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'cliente_id', 'usuario_id', 'tipo', 'observacion'])]
class CrmInteraccion extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<CrmInteraccionFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'crm_interacciones';

    protected function casts(): array
    {
        return [
            'fecha' => 'datetime',
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

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
