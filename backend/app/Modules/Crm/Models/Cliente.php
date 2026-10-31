<?php

namespace App\Modules\Crm\Models;

use App\Modules\Crm\Database\Factories\ClienteFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'nombre', 'documento_fiscal', 'telefono', 'correo', 'direccion', 'activo', 'es_sistema', 'segmento'])]
class Cliente extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<ClienteFactory> */
    use HasFactory;

    const CREATED_AT = 'fecha_registro';

    const UPDATED_AT = null;

    protected $table = 'clientes';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'es_sistema' => 'boolean',
            'fecha_registro' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
